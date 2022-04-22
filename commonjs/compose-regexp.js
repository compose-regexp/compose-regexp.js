(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('compose-regexp', ['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.composeRegexp = {}));
})(this, (function (exports) { 'use strict';

	// Flag detection (conservatively, future flags may break our logic)
	var allFlags = [];
	"dgimsuy".split('').forEach(function(flag) {
		try {
			new RegExp('', flag);
			allFlags.push(flag);
		} catch(e) {}
	});

	// This is currently used for modern vs legacy feature detection
	var supportsU = allFlags.indexOf('u') !== -1;
	var canFoldM = false;
	try {new RegExp('(?<=)'); canFoldM = true;} catch(e){}
	var hasOwn = ({}).hasOwnProperty;
	function identity(x) {return x}
	var map = [].map;
	var slice = [].slice;

	// Used only for type checking
	// the global RegExp is used everywhere else
	// This lets us set the global RegExp to a dummy function when testing,
	// to ensure that the API is throwing SyntaxErrors, not the
	// RegExp constructor downstream.
	var RegExpRef = RegExp;

	// We decode \x.. and \u{......} escapes manually, and defer to JSON.parse
	// for \u.... and surrogate pairs.
	function unescape(str) {
		return str.indexOf('\\') === -1 ? str : JSON.parse('"' + str.replace(/$|"|\\x([\dA-Fa-f]{2})|\\u\{([\dA-Fa-f]{1,6})\}/g, function(match, x, u) {
			return match === '' ? '"' // the $ match at the end
			: match === '"' ? '\\"'
			: String.fromCodePoint(parseInt(x||u, 16))
		}))
	}

	var propDesc = {value: void 0, writable:false, enumerable:false, configurable: false};

	function randId(){return "_" + Math.floor(Math.random() * Math.pow(2,32)).toString(36)}

	var store = 
	// (typeof WeakMap !== 'undefined') ? new WeakMap : 
	// degenerate WeakMap polyfill
	{
		// 128 bits should be enough for everyone
		key: "__$$__compose_regexp__$$__" + randId() + randId() + randId() + randId(),
		set: function(k, v) {
			var type = typeof k;
			if (k == null || type !== 'object' && type !== 'function') {throw new TypeError("Bad WeakMap key")}
			var secret = k[store.key];
			if (!secret) {
				propDesc.value = {keys:[this], values:[v]};
				Object.defineProperty(k, store.key, propDesc);
				return this
			}
			var index = secret.keys.indexOf(this);
			if (index === 0) return (secret.keys.push(this), secret.values.push(v), this)
			return (secret.values[index] = v, this)
		},
		get: function(k) {
			var secret = k[store.key];
			if (secret) {
				var index = secret.keys.indexOf(this);
				if (index !== -1) return secret.values[index]
			}
		}
	};

	// General notes:
	// 
	// 1. Most functions here take an `x` parameter, which is our internal representation
	// of regexps, strings, etc... it has the following structure
	//
	//   {
	//     key: the parameter passed to the API for the first two kinds (see below), the metadata object for 'result'
	//     kind : 'regexp' | 'string' | 'result'
	//     source: the corresponding source, optionally moddified if necessary (fixing numeric refs, wrapping disjunctions in sequences...)
	//   }
	//
	//
	// 2. Stack-mamged globals are denoted by a $ prefix. Functions that mutate said globals start with a $$_ prefix.

	// - - - - - - - -_-_-_-_-_-_- - - - - - - - //
	//  . . .                             + + +  //
	//                                           //
	//    .  .      |_         |      |_         //
	//    |\/| ,--. |   --. ,--|  --. |   --.    //
	//    |  | |--´ |  ,--| |  | ,--| |  ,--|    //
	//    '  ' `--´ `- `--´ `--´ `--´ `- `--´    //
	//                                           //
	//                                           //
	//  + + +         _ _ _ _ _ _         . . .  //
	// - - - - - - - - - - - - - - - - - - - - - //

	// metadata

	// static properties and matching direction info are stored here

	function MetaData() {
		return {
			captureCount: null,
			direction : 0,
			hasRefs: null,
			hasFinalRef: null,
			isDisjunction: null,
			isOneGroupOrAssertion: null,
			source: null,
			unicode: null
		}
	}

	function findOrCreateMd(target) {
		if (target instanceof RegExpRef) {
			var md = store.get(target);
			if (md == null) store.set(target, md = MetaData());
			return md
		} else {
			return target || MetaData()
		}
	}

	var metadata = {
		set: function(target, property, value) {
			var md = findOrCreateMd(target);
			return (typeof property === 'object') 
			? Object.assign(md, property)
			: md[property] = value
		},
		get: function(target, property) {
			var md = findOrCreateMd(target);
			return md[property]
		}
	};

	function mdMemo(property, f) {
		return Object.defineProperty(function(x) {
			var cached = metadata.get(x.key, property);
			if (cached != null) return cached
			return metadata.set(x.key, property, f(x))
		}, 'name', {value: property})
	}

	function getSource(x) {
		return metadata.get(x, 'source') || metadata.set(x, 'source', x.source)
	}

	// - - - - - - - - - - //
	//- - - -     - - -    //
	//                     //
	//    ,      ,-        //
	//    | .--. |~ .--.   //
	//    | |  | |  |  |   //
	//    ' '  ' '  `--´   //
	//                     //
	//    - - -     - - - -//
	// - - - - - - - - - - //

	// Functions gathering static info about regexps, mostly predicates

	// combining (some of) this into a single function may give space
	// and perf gains, at the expense of maintainability

	var uProblemDefaultMatcher = /\\u\d{4}|\\x\d{2}|\\k<(.*?)>|\\c[A-Za-z]|\\([^.?*+^$[\]\\(){}|\/DSWdswBbfnrtv])|\[\^\]|\.|[\[]|(\((?:\?[^])?)|(\)(?:[+?*]|\{\d+,?\d?\})?)/g;
	var uProblemCharClassMatcher = /\\u\d{4}|\\x\d{2}|\\c[A-Za-z]|(\\[DSWdsw]-[^\]]|.-\\[DSWdsw])|\\([^.?*+^$[\]\\(){}|\/DSWdswfnrtv-])|[\]]/g;

	var groupNameMatcher = supportsU && new RegExp('^[_$\\p{ID_Start}][$\\p{ID_Continue}]*', 'u');

	// assesses if a non-unicode RegExp can be updated to unicode
	// problems are invalid escapes, and quantifiers after
	// a lookahead assertion
	var openGroups = [];
	function hasUProblem(x) {
		var matcher = uProblemDefaultMatcher, result;
		openGroups.length = 0;
		function use(x) {
			x.lastIndex = matcher.lastIndex;
			matcher = x;
		}
		uProblemDefaultMatcher.lastIndex = 0;
		while (result = matcher.exec(x)) {
			if (matcher === uProblemDefaultMatcher) {
			// const [
			//   match,
			// 	 namedRef,
			// 	 escapedCharacter,
			// 	 open,
			// 	 close
			// ] = result
				if (result[0] === '[') use(uProblemCharClassMatcher);
				else if (
					result[0] === '.'
					|| result[0] === '[^]'
					|| result[1] != null && !groupNameMatcher.test(unescape(result[1]))
					|| result[2] != null
				) return true

				else if (result[3] != null) {
					openGroups.unshift(result[3]);
				}
				else if (result[4] != null) {
					if ((openGroups[0] === '(?=' || openGroups[0] === '(?!') && result[4] !== ')') return true
					else openGroups.shift();
				}
			} else { // matcher === uProblemCharClassMatcher
			// const [
			//   match,
			// 	 badRange,
			// 	 escapedCharacter,
			// ] = result
				if (result[0] === ']') use(uProblemDefaultMatcher);
				else if (result[1] != null || result[2] != null) return true
			}
		}
		return false
	}

	var captureMatcher = /\\[^]|\(\?[^<]|[\[\](]/g;

	var countCaptures = mdMemo('captureCount', function countCaptures(x) {
		var count = 0, result;
		captureMatcher.lastIndex = 0;
		while(result = captureMatcher.exec(x.source)) {
			{
				if (result[0] === '(') count += 1;
				continue
			}
		}
		return count
	});

	var numRefMatcher = /\\[^1-9]|[\[\]]|\\(\d{1,2})|\(\?:\$ \^d:(\d+),n:(\d+)\)/g;

	var hasRefs = mdMemo('hasRefs', function hasRefs(x) {
		var hasRefs = false, hasFinalRef = false, inCClass = false, result;
		numRefMatcher.lastIndex = 0;
		while(result = numRefMatcher.exec(x.source)) {
			// const [match, refIndex, depth, thunkIndex] = result
			if (!inCClass && (result[1] != null || result[2] != null)) {
				hasRefs = true;
				if (numRefMatcher.lastIndex === x.source.length) hasFinalRef = true;
				continue
			}
			if (result[0] === '[') inCClass = true;
			else if (result[0] === ']') inCClass = false;
		}
		metadata.set(x.key, 'hasFinalRef', hasFinalRef);
		return hasRefs
	});

	var tokenMatcher = /(\\.)|[-()|\[\]]((?=\?(?:=|!|<=|<!))?)/g;

	// When composing expressions into a sequence, regexps that have a top-level
	// choice operator must be wrapped in a non-capturing group. This function
	// detects whether the group is needed or not.

	var isDisjunction = mdMemo('isDisjunction', function isDisjunction(x) {
		if (x.source.indexOf('|') === -1) return false
		var depth = 0, inCClass = false, result;
		tokenMatcher.lastIndex = 0;
		while(result = tokenMatcher.exec(x.source)) {
			// const [match, escape] = result
			if (result[1] != null) continue
			if (!inCClass && result[0] === '(') depth++;
			if (!inCClass && result[0] === ')') depth--;
			if (!inCClass && (result[0] === '[' || result[0] === '[-')) inCClass = true;
			if (inCClass && result[0] === ']') inCClass = false;
			if (depth === 0 && !inCClass && result[0] === '|') return true
		}
		return false
	});

	// Helper function for needsWrappingForQuantifier
	var isOneGroupOrAssertion = mdMemo('isOneGroupOrAssertion', function isOneGroupOrAssertion(x) {
		var source = x.source;
		if (source.charAt(0) !== '(' || source.charAt(source.length - 1) !== ')') return false
		var depth = 0, inCClass = false, result;
		tokenMatcher.lastIndex = 0;
		while(result = tokenMatcher.exec(source)) {
			// const [match, escape] = result
			if (result[1] != null) {
				if (result.index === source.length - 2) return false
				continue
			}
			if (!inCClass && result[0] === '(') depth++;
			if (!inCClass && result[0] === ')') {
				depth--;
				if (depth === 0 && result.index !== source.length - 1) return false
			}
			if (!inCClass && (result[0] === '[' || result === '[-')) inCClass = true;
			if (inCClass && result[0] === ']') inCClass = false;
		}
		return true
	});

	var oneEscapeOrCharClassMatcher = /^\\[^]$|^\[(?:\\[^]|[^\]])*\]$/;

	var pEscapeMatcher = /^\\p\{[A-Z-a-z][A-Za-z=]*\}$/;

	// Determine if a pattern can take a suffix operator or if a non-capturing group
	// is needed around it.
	// We can safely have false negatives (consequence: useless non-capturing groups)
	// whereas false positives would be bugs. We do have some false positives:
	// some charsets will be marked as non-atomic.
	function needsWrappingForQuantifier(x) {
		var source = x.source;
		if (source == null || source === '^' || source === '$' || source === '\\b' || source === '\\B') throw new SyntaxError("Nothing to repeat: /"+(source || '(?:)')+"/")
		// No need to look for standalone \k escapes, the are illegal in U and N mode, an non-atomic otherwise.
		if (
			source.length === 1 
			|| oneEscapeOrCharClassMatcher.test(source) 
			|| $flagValidator.U && pEscapeMatcher.test(source)
		) return false

		var og = isOneGroupOrAssertion(x);
		if (!og) return true
		if (/^\(\?<?[!=]/.test(source)) throw new SyntaxError("Nothing to repeat: /"+source+"/")
		return false
	}

	// - - - - - - - - - - - - - - - - //
	//- - - -     - - -     - -     -  //
	//                                 //
	//    ,---                         //
	//    |~  . .  , ,--. ,--. ,--.    //
	//    |   |  }{  |--´ |    `--.    //
	//    '   ' ´  ` `--´ '    `--´    //
	//                                 //
	//  -     - -     - - -     - - - -//
	// - - - - - - - - - - - - - - - - //


	// Procedure that validate or update patterns when necessary

	var loneBracketMatcher = /\{\d+,?\d*\}|\\[^]|\]|\[|\}/g;

	// fixes non-u regexps for unicode promotion, if needed
	// - escapes lone brackets
	// - updates the . to and [^] to explicit ranges that exclude the astral characters
	function promoteNonUnicodeToUnicode (source) {
		var inCClass = false;
		return source.replace(loneBracketMatcher, function(match) {
			if (match === '[') inCClass = true;
			if (match === ']') {
				if (inCClass) inCClass = false;
				else return '\\]'
			}
			if (!inCClass) {
				if(match === '}') return '\\}'
			}
			return match
		})
	}


	// numeric backrefs must be updated for proper composition
	// this ensures that sequence(/()\1/, /()\1/) becomes /()\1()\2/
	function $$_fixRefs(initialOffset) {
		var count = initialOffset;
		return function (x) {
			if (x.kind === 'regexp' || x.kind === 'result') {
				if (hasRefs(x)) {
					$refAndCap.hasRefs = true;
					var inCClass = false;
					x.source = x.source.replace(numRefMatcher, function(match, refIndex, depth, thunkIndex) {
						if (!inCClass) {
							if (refIndex != null) {
								var fixedRefIndex = (Number(refIndex) + count);
								if (fixedRefIndex > 99) throw new RangeError("Too many back references")

								return '\\' + String(fixedRefIndex)
							} else if (depth != null) {
								if (depth === '0') return '\\' + String(thunkIndex)
								else return '(?:$ ^d:' + (Number(depth) -1) + ',n:' + thunkIndex + ')'
							}
						}
						if (match === '[') inCClass = true;
						else if (match === ']') inCClass = false;
						return match
					});
				}

				$refAndCap.hasFinalRef = !!metadata.get(x.key, 'hasFinalRef');
				count += countCaptures(x);
			}
			// overwritten several times, the final value is the real total
			$refAndCap.captureCount = count;
			return x
		}
	}

	var dotMDotSMatcher = /\\.|\.|\(\?:\^\|\(\?<=\[\\n\\r\\u2028\\u2029\]\)\)|\(\?:\$\|\(\?=\[\\n\\r\\u2028\\u2029\]\)\)|\[|\]|\^|\$/g;
	function fixForFlags(x) {
		var source = x.source;
		if($flagValidator.U && (x.kind === 'regexp' && !x.key.unicode || x.kind === 'result' && !metadata.get(x.key, 'unicode'))) {
				if(hasUProblem(source)) throw new SyntaxError("Can't upgrade the RegExp to Unicode /"+ source +"/" + x.kind === 'regexp' ? x.key.flags : '')
				x.source = promoteNonUnicodeToUnicode(source);
		}
		var inCClass = false;
		if (x.kind === 'regexp' && (x.key.dotAll || x.key.multiline)) x.source = source.replace(dotMDotSMatcher, function(match) {
			if (!inCClass) {
				if (match === '[') inCClass = true;
				return (x.key.dotAll && match === '.') ? '[^]' 
				: (x.key.multiline && match === '^'&& canFoldM) ? '(?:^|(?<=[\\n\\r\\u2028\\u2029]))'
				: (x.key.multiline && match === '$' && canFoldM) ? '(?:$|(?=[\\n\\r\\u2028\\u2029]))'
				: match
			} else {
				if (match === ']') inCClass = false;
				return match
			}
			
		});
		return x
	}

	// ensures that each flag appears only once
	var flagsMatcher = new RegExp('^(?:([' + allFlags.join('') + '])(?!.*\\1))*$');

	function $$_checkFlags(x) {
		var flags = x.key.flags;

		if (!flagsMatcher.test(flags)) throw new TypeError("Unkown flags: " + flags.replace(new RegExp('['+allFlags.join()+']', 'g'), ''))

		var hasU = !!x.key.unicode;
		var hasI = x.key.ignoreCase;
		var hasM = x.key.multiline;

		if ($flagValidator.I != null && hasI !== $flagValidator.I) throw new SyntaxError("Can't combine i and non-i regexps: " + x.key)
		if (!canFoldM && $flagValidator.M != null && hasI !== $flagValidator.M) throw new SyntaxError("Can't combine m and non-m regexps: " + x.key)

		$flagValidator.I = hasI;
		$flagValidator.M = hasM;
		$flagValidator.U = $flagValidator.U || hasU;
		return x
	}


	//+
	var directionNames = {'-1': 'backward', '1': 'forward'};
	function $$_checkDirection(x) {
		var d = metadata.get(x.key, 'direction');
		if (d * $direction.current === -1)  throw new TypeError(
			"Illegal " + directionNames[d] + " RegExp argument while building a " + directionNames[$direction.current] + " one: /" + x.source + "/"
		)
		if (d !== 0) $refAndCap.hasRefs = true;
		return x
	}

	// joining is done from the end, using reduceRight.
	// the accumulator `x2` holds the tail of the results
	// it starts with a `null` value

	function join(forEither) {
		return forEither
		? function(x2, x1){
			x2.source = x2.source == null ? x1.source : x1.source + '|' + x2.source;
			return x2
		}
		: function(x2, x1){
			x2.source = x2.source == null 
			? x1.source 
			: x1.source + (
				// corner case where a numeric ref is followed by a number
				x1.kind !== 'string' 
				// sets the 'hasFinalRef' metadata as a side effect
				&& hasRefs(x1)
				&& metadata.get(x1.key, 'hasFinalRef') 
				&& (/^\d/.test(x2.source))
				? '(?:)'
				: ''
			) + x2.source;
		
			return x2
		}
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - //
	//- - - - -     - - - - -     - -     - -     -    //
	//                                                 //
	//    ,--.                  |                      //
	//    |    ,--. ,--. ,--.   |   ,--. ,--. ' ,--.   //
	//    |    |  | |    |--´   |   |  | |  | | |      //
	//    `--´ `--´ '    `--´   `-- `--´ `--| ' `--´   //
	//                                   `--´          //
	//                                                 //
	//    -     - -     - -     - - - - -     - - - - -//
	// - - - - - - - - - - - - - - - - - - - - - - - - //

	// Core Logic

	// the $ prefix is there to denote engine state as stack-managed globals

	// manages the logic relating to parsing direction
	// (look behind applies the patterns backwards).
	// Avoid mixing in back references intended to
	// match in one direction inside a regexp that
	// goes the other way.
	var $direction = {
		current: 1,
	};

	var $flagValidator;
	var $refAndCap;

	function $$_resetRefCapsAndFlags() {
		// atoms and direction
		$refAndCap = {hasRefs: false, hasFinalRef: false, captureCount: 0};
		$flagValidator = {U: false, I: null, M: null};
	}

	// makes sure `assemble()` is reentrant by stashing and popping
	// back global state according to the stack depth. Must be `.apply()`ed or `.call()`ed
	// passing the target function as context.
	// Used by both the aforementioned functions, and the public API.

	function $$_reentrantRefCapFlag(f) {
		var previousRnC = $refAndCap;
		var previousFV = $flagValidator;
		try {return f()} finally {
			$refAndCap = previousRnC;
			$flagValidator = previousFV;
		}
	}

	// used for adding groups, assertions and quantifiers

	function decorate(x, options) {
		// console.log({x, options})
		if(!options.condition || options.condition(x)) x.source = options.open + (x.source || '') + ')';
		if (options.suffix) x.source += options.suffix;
		return x
	}

	function wrapIfTopLevelDisjunction(x) {
		return decorate(x, {
			condition: function(x) { return (x.kind === 'regexp' || x.kind === 'result') && isDisjunction(x)},
			open: '(?:'
		})
	}

	var stringNormalizerMatcher = /[.?*+^$[\]\\(){}|]/g;

	function handleOtherTypes (x) {
		if (typeof x === 'number' || typeof x === 'string') return {
			key: null,
			kind: 'string',
			source: String(x).replace(stringNormalizerMatcher, '\\$&')
		}
		throw new TypeError("Can't compose type " + typeof x + " as RegExp")
	}

	// The recursive brain of compose-regexp

	function assemble(patterns, either, contextRequiresWrapping, initialCapIndex) {
		// console.log({patterns})
		// this and [1] below could probably be simplified
		contextRequiresWrapping = contextRequiresWrapping || patterns.length > 1;
		return map.call(patterns, function processItem(item) {
			return (
					// [1] see comment above
					(!either && contextRequiresWrapping) ? wrapIfTopLevelDisjunction : identity
				)(
					Array.isArray(item) ? assemble(item, false, contextRequiresWrapping, 0)
					// thunks are materialized downstream
					: typeof item === 'function' ? processItem($$_reentrantRefCapFlag(item))
					: (item instanceof RegExpRef) ? $$_checkDirection($$_checkFlags({
						key: item,
						kind: 'regexp',
						source: getSource(item)
					}))
					: handleOtherTypes(item)
				)
			// fixForFlags and $$_fixRefs can't be inlined in the first mat, above they rely on side effects of the
			// `check` functions having all happenned before they run.
			// at best they could be combined into a single function.
		}).map(fixForFlags).map($$_fixRefs(initialCapIndex)).reduceRight(join(either), {
			key: metadata.set(null, Object.assign({
				direction: $refAndCap.hasRefs ? $direction.current : 0,
				isDisjunction: either && (patterns.length > 1 || patterns.length === 1  && (patterns[0] instanceof RegExpRef) && metadata.get(patterns[0], 'isDisjunction')),
				unicode: $flagValidator.U
			}, $refAndCap)),
			kind: 'result', 
			source: null
		})
	}

	function getFlags(){
		return (($flagValidator.I ? 'i' : '') + (canFoldM ? '' : $flagValidator.M ? 'm' : '') + ($flagValidator.U ? 'u' : ''))
	}

	function finalize(x, options) {
		// console.trace({x})
		// const {flags, direction} = options
		options = options || {};
		var flags = hasOwn.call(options, 'flags') ? options.flagsOp(getFlags(), options.flags) : getFlags();
		var result = new RegExp((x.source || ''), flags);
		metadata.set(result, metadata.set(x.key, {}));
		metadata.set(result, 'source', x.source);
		if (hasOwn.call(options, 'direction')) metadata.set(result, 'direction', options.direction);
		return result
	}

	//- - - - - - - - - - -//
	// - - ~ - -   - -   - //
	//                     //
	//    ,--.  ,--.  .    //
	//    |  |  |  |  |    //
	//    |--|  |--´  |    //
	//    '  '  '     '    //
	//                     //
	// -   - -   - - ~ - - //
	//- - - - - - - - - - -//

	// public API

	var empty = /(?:)/;

	function either() {
		if (!arguments.length) return empty
	    $$_resetRefCapsAndFlags();
	    return finalize(assemble(arguments, true, false, 0))
	}

	function _sequence() {
		return assemble(arguments, false, false, 0)
	}

	function sequence() {
	    if (!arguments.length) return empty
	    $$_resetRefCapsAndFlags();
	    return finalize(_sequence.apply(null, arguments))
	}

	function makeAssertion (before, direction) {
		return function () {
			if (!arguments.length) return empty
	        var previousDir = $direction.current;
	        $direction.current = direction;
	        try {
	            $$_resetRefCapsAndFlags();
	            var result = _sequence.apply(null, arguments);
	            return finalize(decorate(result, {open: before}), {direction: 0})
	        } finally {
	            $direction.current = previousDir;
	        }
		}
	}

	var lookAhead = makeAssertion('(?=', 1);
	var notAhead = makeAssertion('(?!', 1);
	var lookBehind = makeAssertion('(?<=', -1);
	var notBehind = makeAssertion('(?<!', -1);

	var suffixMatcher = /^(?:\+|\*|\?|\{(\d+),?(\d*)\})\??$/;

	var call = _suffix.call;

	function _suffix() {
		// the quantifier is passed as context
		$$_resetRefCapsAndFlags();
		// a neat hack to pass all arguements but the operator to `_sequence()`
		// without allocating an array. The operator is passed as `this` which is ignored.
		var res = call.apply(_sequence, arguments);
		return finalize(decorate(res, {condition: needsWrappingForQuantifier, open: '(?:', suffix: this}))
	}

	function suffix(quantifier) {
		if (typeof quantifier !== 'string') quantifier = '{' + String(quantifier) + '}';
		var match = quantifier.match(suffixMatcher);
		if (!match || match[2] && Number(match[2]) < Number(match[1])) throw new SyntaxError("Invalid suffix '" + quantifier+ "'.")
		return arguments.length === 1
		? _suffix.bind(quantifier, quantifier)
		: _suffix.apply(quantifier, arguments)
	}

	var maybe = suffix('?');


	// Named groups are AFAIK not supported in engines that don't support the u flag.
	// Even if they were, the validator would be huge: Clipped to the BMP,
	// - /\p{ID_Start}/u     is  /[A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-ࢎࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡৰ-ৱৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౝౠ-ౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೝ-ೞೠ-ೡೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะา-ำเ-ๆກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮ-ᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽ-ꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
	// - /\p{ID_Continue}/u  is  /[0-9A-Z_a-zªµ·ºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶ-ͷͺ-ͽͿΆ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԯԱ-Ֆՙՠ-ֈ֑-ֽֿׁ-ׂׄ-ׇׅא-תׯ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺ߽ࠀ-࠭ࡀ-࡛ࡠ-ࡪࡰ-ࢇࢉ-ࢎ࢘-ࣣ࣡-ॣ०-९ॱ-ঃঅ-ঌএ-ঐও-নপ-রলশ-হ়-ৄে-ৈো-ৎৗড়-ঢ়য়-ৣ০-ৱৼ৾ਁ-ਃਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹ਼ਾ-ੂੇ-ੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ૹ-૿ଁ-ଃଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହ଼-ୄେ-ୈୋ-୍୕-ୗଡ଼-ଢ଼ୟ-ୣ୦-୯ୱஂ-ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఀ-ఌఎ-ఐఒ-నప-హ఼-ౄె-ైొ-్ౕ-ౖౘ-ౚౝౠ-ౣ౦-౯ಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕ-ೖೝ-ೞೠ-ೣ೦-೯ೱ-ೲഀ-ഌഎ-ഐഒ-ൄെ-ൈൊ-ൎൔ-ൗൟ-ൣ൦-൯ൺ-ൿඁ-ඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟ෦-෯ෲ-ෳก-ฺเ-๎๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘-༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟፩-፱ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-᜕ᜟ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲ-ᝳក-៓ៗៜ-៝០-៩᠋-᠍᠏-᠙ᠠ-ᡸᢀ-ᢪᢰ-ᣵᤀ-ᤞᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧ᪰-᪽ᪿ-ᫎᬀ-ᭌ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿ᳐-᳔᳒-ᳺᴀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‿-⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠧ꠬ꡀ-ꡳꢀ-ꣅ꣐-꣙꣠-ꣷꣻꣽ-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꧠ-ꧾꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯪ꯬-꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︯︳-︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
	// i.e. 2 extra KiB

	function validateGroupName(name) {
		return !supportsU || groupNameMatcher.test(unescape(name))
	}

	function checkRef(name) {
		var type = typeof name;
		return type === 'string' && validateGroupName(name)
		|| type === 'number' && 0 < name && Math.round(name) === name
	}

	function ref(n, depth) {
		if (!checkRef(n)) throw new SyntaxError("Bad ref: " + n)
		if ((depth != null) && (typeof depth !== 'number' || depth < 1 || (depth !== depth|0))) throw new RangeError("Bad depth: " + depth)
	    if (typeof n === 'string') return new RegExp('\\k<' + n + '>')
		var result = new RegExp('(?:$ ^d:' + (depth || '0')+ ",n:" + n + ")");
		metadata.set(result, {
	        direction: $direction.current,
	        hasFinalRef: true,
	        hasRefs: true,
	    });
		return result
	}

	function capture() {
		$$_resetRefCapsAndFlags();
	    var res = assemble(arguments, false, false, 1);
		return finalize(decorate(res, {open: '('}))
	}

	function _namedCapture(name) {
		if (typeof name !== 'string') throw new TypeError("String expected, got " + typeof name)
		validateGroupName(name);
		$$_resetRefCapsAndFlags();
	    var res = assemble(slice.call(arguments, 1), false, false, 1);
	    return finalize(decorate(res, {open: '(?<' + name + '>'}))
	}

	function namedCapture(name) {
		return (arguments.length === 1
		? _namedCapture.bind(null, name)
		: _namedCapture.apply(null, arguments))
	}

	//- - - - - - - - - - - - - - - //
	//-- -  -   -    -     -      - //
	//    ,---                      //
	//    |__ |   ,--. ,--. ,--.    //
	//    |   |   ,--| |  | `--.    //
	//    '   `-- `--' `--| `--´    //
	//                 `--´         //
	// -      -     -    -   -  - --//
	//- - - - - - - - - - - - - - - //

	// flag operations

	// core functions

	function flagAdd(a, b) {
		a = a.split('');
		b.split('').forEach(function(flag){if (a.indexOf(flag) === -1) a.push(flag);});
		return a.sort().join('')
	}

	function _flags(fl) {
		// the operation is passed as context
		$$_resetRefCapsAndFlags();
	    // flags.remove throws if passed 'u' so if present here, it is to be added and the engine should know
	    // beforehand
		if (fl.indexOf('u') !== -1) $flagValidator.U = true;
		// bad hack, see _suffix
		var source = call.apply(_sequence, arguments);
		return finalize(source, {flagsOp: this, flags: fl})
	}

	var flags = {add: function add(flags) {
		if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
		if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
		return arguments.length === 1
		? _flags.bind(flagAdd, flags)
		: _flags.apply(flagAdd, arguments)
	}};


	// higher level functions

	function atomic() {
	    return $direction.current === 1
	    // forward:
	    ? sequence(lookAhead(capture.apply(null, arguments)), ref(1))
	    // backward:
	    : sequence(ref(1), lookBehind(capture.apply(null, arguments)))
	}

	function csDiff(a, b) {return sequence(notAhead(b), a)}
	function csInter(a, b) {return sequence(notAhead(csDiff(a, b)), a)}

	var charSet = {
		union: either,
		difference: csDiff,
		intersection: csInter
	};

	function bound(pt) {
		return either(
			[notBehind(pt), lookAhead(pt)],
			[lookBehind(pt), notAhead(pt)]
		)
	}

	exports.atomic = atomic;
	exports.bound = bound;
	exports.capture = capture;
	exports.charSet = charSet;
	exports.either = either;
	exports.flags = flags;
	exports.lookAhead = lookAhead;
	exports.lookBehind = lookBehind;
	exports.maybe = maybe;
	exports.namedCapture = namedCapture;
	exports.notAhead = notAhead;
	exports.notBehind = notBehind;
	exports.ref = ref;
	exports.sequence = sequence;
	exports.suffix = suffix;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
