(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('compose-regexp', ['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.composeRegexp = {}));
})(this, (function (exports) { 'use strict';

	// Flag detection (conservatively, future flags may break our logic)
	const allFlags = [];
	"dgimsuy".split('').forEach(function(flag) {
		try {
			new RegExp('', flag);
			allFlags.push(flag);
		} catch(e) {}
	});

	// This is currently used for modern vs legacy feature detection
	const supportsU = allFlags.indexOf('u') !== -1;
	const supportsLookBehind = (()=>{try {new RegExp('(?<=)'); return true} catch(e){return false}})();
	const hasOwn = ({}).hasOwnProperty;
	function identity(x) {return x}
	const map = [].map;

	// Used only for type checking
	// the global RegExp is used everywhere else
	// This lets us set the global RegExp to a dummy function when testing,
	// to ensure that our API is throwing early SyntaxErrors, not the
	// RegExp constructor downstream (we have more info and can give more
	// precise feedback).
	const RegExpRef = RegExp;

	// We decode \x.. and \u{......} escapes manually, and defer to JSON.parse
	// for \u.... and surrogate pairs.
	function unescape(str) {
		return str.indexOf('\\') === -1 ? str : JSON.parse('"' + str.replace(/$|"|\\x([\dA-Fa-f]{2})|\\u\{([\dA-Fa-f]{1,6})\}/g, function(match, x, u) {
			return match === '' ? '"' // the $ match at the end
			: match === '"' ? '\\"'
			: String.fromCodePoint(parseInt(x||u, 16))
		}))
	}

	const propDesc = {value: void 0, writable:false, enumerable:false, configurable: false};

	function randId(){return "_" + Math.floor(Math.random() * Math.pow(2,32)).toString(36)}

	const store =
	(typeof WeakMap !== 'undefined') ? new WeakMap :
	// degenerate WeakMap polyfill
	{
		// 128 bits should be enough for everyone
		key: "__$$__compose_regexp__$$__" + randId() + randId() + randId() + randId(),
		set: function(k, v) {
			const type = typeof k;
			if (k == null || type !== 'object' && type !== 'function') {throw new TypeError("Bad WeakMap key")}
			const secret = k[store.key];
			if (!secret) {
				propDesc.value = {keys:[this], values:[v]};
				Object.defineProperty(k, store.key, propDesc);
				return this
			}
			const index = secret.keys.indexOf(this);
			if (index === 0) return (secret.keys.push(this), secret.values.push(v), this)
			return (secret.values[index] = v, this)
		},
		get: function(k) {
			const secret = k[store.key];
			if (secret) {
				const index = secret.keys.indexOf(this);
				if (index !== -1) return secret.values[index]
			}
		}
	};

	//              /!\ DO NOT EDIT MANUALLY /!\


	const captureMatcher = /\\[^]|\(\?(?::|<?[=!])|[\[\](]/g;


	const dotMDotSMatcher = /\\.|\.|\(\?:\^\|\(\?<=\[\\n\\r\\u2028\\u2029\]\)\)|\(\?:\$\|\(\?=\[\\n\\r\\u2028\\u2029\]\)\)|\[|\]|\^|\$/g;


	const groupNameMatcher = supportsU && new RegExp("^[_$\\p{ID_Start}][$\\p{ID_Continue}]*$", 'u');


	const loneBracketMatcher = /\\.|\{\d+(?:,\d*)?\}|(\[|\]|\{|\})/g;


	const mEndAnchor = /(?:$|(?=[\n\r\u2028\u2029]))/;


	const mStartAnchor = /(?:^|(?<=[\n\r\u2028\u2029]))/;


	const numRefMatcher = /\\[^1-9]|[\[\]]|\\(\d{1,2})|\$d:(\d+),n:(\d+)\^/g;


	const oneEscapeOrCharClassMatcher = /^(?:\\.|\[(?:[^\]\\]|\\.)*\])$/;


	const pEscapeMatcher = /^\\p\{[A-Za-z][A-Za-z=]*\}$/;


	const stringNormalizerMatcher = /[.?*+^$[\]\\(){}|]/g;


	const suffixMatcher = /^(?:[+*?]|\{(\d+)(?:,(\d*))?\})\??$/;


	const tokenMatcher = /(\\.)|[-()|\[\]]((?=\?<?[=!]))?/g;


	const uProblemCharClassMatcher = /\\u[0-9A-Fa-f]{4}|\\x[0-9A-Fa-f]{2}|\\c[A-Za-z]|\\([^.?*+^$[\]\\(){}|\/DSWdswfnrtv-])|(\\[DSWdsw]-[^\]]|.-\\[DSWdsw])|\\.|\]/g;


	const uProblemDefaultMatcher = /\\u[0-9A-Fa-f]{4}|\\x[0-9A-Fa-f]{2}|\\c[A-Za-z]|\\k<(.*?)>|\\([^.?*+^$[\]\\(){}|\/DSWdswBbfnrtv])|\\.|\.|\[\^\]|\[|(\((?:\?[^])?)|(\)(?:[+?*]|\{\d+,?\d*\})?)/g;

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
			let md = store.get(target);
			if (md == null) store.set(target, md = MetaData());
			return md
		} else {
			return target || MetaData()
		}
	}

	const metadata = {
		set: function(target, property, value) {
			const md = findOrCreateMd(target);
			return (typeof property === 'object')
			? Object.assign(md, property)
			: md[property] = value
		},
		get: function(target, property) {
			const md = findOrCreateMd(target);
			return md[property]
		}
	};

	function mdMemo(property, f) {
		return Object.defineProperty(function(x) {
			const cached = metadata.get(x.key, property);
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

	// assesses if a non-unicode RegExp can be updated to unicode
	// problems are invalid escapes, and quantifiers after
	// a lookahead assertion
	const openGroups = [];
	function hasUProblem(x) {
		let matcher = uProblemDefaultMatcher;
		let result;
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
			// 	 escapedCharacter,
			// 	 badRange,
			// ] = result
				if (result[0] === ']') use(uProblemDefaultMatcher);
				else if (result[1] != null || result[2] != null) return true
			}
		}
		return false
	}

	const countCaptures = mdMemo('captureCount', function countCaptures(x) {
		let count = 0, result;
		captureMatcher.lastIndex = 0;
		while(result = captureMatcher.exec(x.source)) {
			{
				if (result[0] === '(') count += 1;
				continue
			}
		}
		return count
	});

	const hasRefs = mdMemo('hasRefs', function hasRefs(x) {
		let hasRefs = false, hasFinalRef = false, inCClass = false, result;
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

	// When composing expressions into a sequence, regexps that have a top-level
	// choice operator must be wrapped in a non-capturing group. This function
	// detects whether the group is needed or not.

	const isDisjunction = mdMemo('isDisjunction', function isDisjunction(x) {
		if (x.source.indexOf('|') === -1) return false
		let depth = 0, inCClass = false, result;
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
	const isOneGroupOrAssertion = mdMemo('isOneGroupOrAssertion', function isOneGroupOrAssertion(x) {
		const source = x.source;
		if (source.charAt(0) !== '(' || source.charAt(source.length - 1) !== ')') return false
		let depth = 0, inCClass = false, result;
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

	// Determine if a pattern can take a suffix operator or if a non-capturing group
	// is needed around it.
	// We can safely have false negatives (consequence: useless non-capturing groups)
	// whereas false positives would be bugs. We do have some false positives:
	// some charsets will be marked as non-atomic.
	function needsWrappingForQuantifier(x) {
		const source = x.source;
		if (source == null || source === '^' || source === '$' || source === '\\b' || source === '\\B') {
			throw new SyntaxError(`Nothing to repeat: / ${source || '(?:)' }/`)
		}
		// No need to look for standalone \k escapes, the are illegal in U and N mode, an non-atomic otherwise.
		if (
			source.length === 1
			|| oneEscapeOrCharClassMatcher.test(source)
			|| $flagValidator.U && pEscapeMatcher.test(source)
		) return false

		const og = isOneGroupOrAssertion(x);
		if (!og) return true
		// Reject look-arounds
		if (/^\(\?<?[!=]/.test(source)) throw new SyntaxError(`Nothing to repeat: /${ source }/`)
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


	// Procedure that validates or updates patterns when necessary

	// fixes non-u regexps for unicode promotion, if needed
	// - escapes lone brackets
	// - updates the . to and [^] to explicit ranges that exclude the astral characters
	function promoteNonUnicodeToUnicode (source) {
		let inCClass = false;
		return source.replace(loneBracketMatcher, function(match, bracket) {
			if (match === ']') {
				if (inCClass) inCClass = false;
				else return '\\]'
			}
			else if (!inCClass && bracket != null) {
				if (bracket === '[') inCClass = true;
				else return '\\' + bracket
			}
			return match
		})
	}

	// numeric backrefs must be updated for proper composition
	// this ensures that sequence(/()\1/, /()\1/) becomes /()\1()\2/
	function $$_fixRefs(initialOffset) {
		let count = initialOffset;
		return function (x) {
			if (x.kind === 'regexp' || x.kind === 'result') {
				if (hasRefs(x)) {
					$refAndCap.hasRefs = true;
					let inCClass = false;
					x.source = x.source.replace(numRefMatcher, function(match, refIndex, depth, thunkIndex) {
						if (!inCClass) {
							if (refIndex != null) {
								const fixedRefIndex = (Number(refIndex) + count);
								if (fixedRefIndex > 99) throw new RangeError("Back reference index larger than 99")

								return '\\' + String(fixedRefIndex)
							} else if (depth != null) {
								if (depth === '0') {
									const fixedRefIndex = Number(thunkIndex) + initialOffset;
									if (fixedRefIndex > 99) throw new RangeError("Back reference index larger than 99")
									return '\\' + String(fixedRefIndex)
								}
								else return `$d:${ Number(depth) - 1 },n:${ thunkIndex }^`
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

	const hasLoneQuantifierBracket = mdMemo('hasLoneQuantifierBracket', function hasLoneQuantifierBracket(x) {
		let result, inCClass = false;
		loneBracketMatcher.lastIndex = 0;
		while (result = loneBracketMatcher.exec(x.source)) {
			if (result[1] == null) continue
			if (inCClass) {
				if (result[1] === ']') inCClass = false;
			} else {
				if (result[1] === '[') inCClass = true;
				else if (result[1] === ']') continue
				else return result[1]
			}
		}
		return false
	});

	function rejectLoneBracket(x) {
		if (x == null || x.kind !== 'regexp' || x.key.unicode) return x
		const bracket = hasLoneQuantifierBracket(x);
		if (bracket === false) return x
		throw new SyntaxError(`Lone quantifier bracket ${bracket} in /${x.source}/${x.key.flags}`)
	}

	function fixForFlags(x) {
		const source = x.source;
		if ($flagValidator.U && (x.kind === 'regexp' && !x.key.unicode || x.kind === 'result' && !metadata.get(x.key, 'unicode'))) {
			if(hasUProblem(source)) {
				throw new SyntaxError(`Can't upgrade the RegExp to Unicode /${ source }/${ x.kind === 'regexp' ? x.key.flags : '' }`)
			}
			x.source = promoteNonUnicodeToUnicode(source);
		}
		let inCClass = false;
		if (x.kind === 'regexp' && (x.key.dotAll || x.key.multiline)) x.source = source.replace(dotMDotSMatcher, function(match) {
			if (!inCClass) {
				if (match === '[') inCClass = true;
				return (x.key.dotAll && match === '.') ? '[^]'
				: (x.key.multiline && match === '^'&& supportsLookBehind) ? mStartAnchor.source
				: (x.key.multiline && match === '$' && supportsLookBehind) ? mEndAnchor.source
				: match
			} else {
				if (match === ']') inCClass = false;
				return match
			}

		});
		return x
	}

	// ensures that each flag appears only once
	const flagsMatcher = new RegExp(`^(?:([${ allFlags.join('') }])(?!.*\\1))*$`);

	const flagFinder = new RegExp(`[${ allFlags.join() }]`, 'g');
	function $$_checkFlags(x) {
		const flags = x.key.flags;

		if (!flagsMatcher.test(flags)) {
			throw new TypeError(`Unkown flag(s): ${ flags.replace(flagFinder, '')}`)
		}

		const hasU = !!x.key.unicode;
		const hasI = x.key.ignoreCase;
		const hasM = x.key.multiline;

		if ($flagValidator.I != null && hasI !== $flagValidator.I) {
			throw new SyntaxError("Can't combine i and non-i regexps: " + x.key)
		}
		if (!supportsLookBehind && $flagValidator.M != null && hasM !== $flagValidator.M) {
			throw new SyntaxError("Can't combine m and non-m regexps: " + x.key)
		}

		$flagValidator.I = hasI;
		$flagValidator.M = hasM;
		$flagValidator.U = $flagValidator.U || hasU;
		return x
	}


	//+
	const directionNames = {'-1': 'backward', '1': 'forward'};
	function $$_checkDirection(x) {
		const d = metadata.get(x.key, 'direction');
		if (d * $direction.current === -1)  throw new TypeError(
			`Illegal ${
			directionNames[d]
		} RegExp argument while building a ${
			directionNames[$direction.current]
		} one: /${
			x.source
		}/`
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
			x2.source = x2.source == null ? x1.source : `${ x1.source }|${ x2.source }`;
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
	let $direction = {
		current: 1,
	};

	let $flagValidator;
	let $refAndCap;

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
		const previousRnC = $refAndCap;
		const previousFV = $flagValidator;
		try {return f()} finally {
			$refAndCap = previousRnC;
			$flagValidator = previousFV;
		}
	}

	// used for adding groups, assertions and quantifiers

	function decorate(x, options) {
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

	function handleOtherTypes (x) {
		if (typeof x === 'number' || typeof x === 'string') return {
			key: null,
			kind: 'string',
			source: String(x).replace(stringNormalizerMatcher, '\\$&')
		}
		throw new TypeError(`Can't compose type ${ typeof x } as RegExp`)
	}

	// The recursive brain of compose-regexp

	function assemble(patterns, either, contextRequiresWrapping, initialCapIndex) {
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
					: (item instanceof RegExpRef) ? rejectLoneBracket($$_checkDirection($$_checkFlags({
						key: item,
						kind: 'regexp',
						source: getSource(item)
					})))
					: handleOtherTypes(item)
				)
			// fixForFlags and $$_fixRefs can't be combined in the map() calback above,
			// as they rely on side effects of the `check` functions having all happenned
			// before they themselves run.
			// At best they could be combined into a single function, but it would hamper clarity.
		})
		.map(fixForFlags)
		.map($$_fixRefs(initialCapIndex))
		.reduceRight(join(either), {
			key: metadata.set(null, Object.assign({
				direction: $refAndCap.hasRefs ? $direction.current : 0,
				isDisjunction: either && (
					patterns.length > 1
					|| patterns.length === 1  && (patterns[0] instanceof RegExpRef) && metadata.get(patterns[0], 'isDisjunction')
				),
				unicode: $flagValidator.U
			}, $refAndCap)),
			kind: 'result',
			source: null
		})
	}

	function getFlags(){
		return (($flagValidator.I ? 'i' : '') + (supportsLookBehind ? '' : $flagValidator.M ? 'm' : '') + ($flagValidator.U ? 'u' : ''))
	}

	function finalize(x, options) {
		options = options || {};
		const flags = hasOwn.call(options, 'flags') ? options.flagsOp(getFlags(), options.flags) : getFlags();
		const either = options.either;
		const result = new RegExp((either ? x.source || '[]': x.source || ''), flags);
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

	const empty = /(?:)/;
	const never = /[]/;

	function throwIfNoLookBehind(name) {
		if (!supportsLookBehind) throw new Error("no support for /(?<=...)/ which is required by " + name + "()")
	}

	function either(...args) {
		if (args.length === 0) return never
	    $$_resetRefCapsAndFlags();
	    return finalize(assemble(args, true, false, 0), {either: true})
	}

	function _sequence(...args) {
		return assemble(args, false, false, 0)
	}

	function sequence(...args) {
	    if (args.length === 0) return empty
	    $$_resetRefCapsAndFlags();
	    return finalize(_sequence(...args))
	}

	function makeAssertion (before, direction, emptyFallback, gate, name) {
		return function (...args) {
			if (gate != null) gate(name);
			if (!args.length) return emptyFallback
	        const previousDir = $direction.current;
	        $direction.current = direction;
	        try {
	            $$_resetRefCapsAndFlags();
	            const result = _sequence(...args);
	            return finalize(decorate(result, {open: before}), {direction: 0})
	        } finally {
	            $direction.current = previousDir;
	        }
		}
	}

	const lookAhead = makeAssertion('(?=', 1, empty);
	const notAhead = makeAssertion('(?!', 1, never);
	const lookBehind = makeAssertion('(?<=', -1, empty, throwIfNoLookBehind, "lookBehind");
	const notBehind = makeAssertion('(?<!', -1, never, throwIfNoLookBehind, "notBehind");

	_suffix.call;

	function _suffix(quantifier, ...args) {
		// the quantifier is passed as context
		$$_resetRefCapsAndFlags();
		// a neat hack to pass all arguements but the operator to `_sequence()`
		// without allocating an array. The operator is passed as `this` which is ignored.
		if (args.length === 0) throw new SyntaxError("Suffix to an empty prefix")
		const res = _sequence(...args);
		return finalize(decorate(res, {condition: needsWrappingForQuantifier, open: '(?:', suffix: quantifier}))
	}

	function suffix(quantifier, ...args) {
		if (typeof quantifier !== 'string') quantifier = '{' + String(quantifier) + '}';
		const match = quantifier.match(suffixMatcher);
		if (!match || match[2] && Number(match[2]) < Number(match[1])) throw new SyntaxError("Invalid suffix '" + quantifier+ "'.")
		return args.length === 0
		? _suffix.bind(null, quantifier)
		: _suffix(quantifier, ...args)
	}

	const maybe = suffix('?');


	// Named groups are AFAIK not supported in engines that don't support the u flag.
	// Even if they were, the validator would be huge: Clipped to the BMP,
	// - /\p{ID_Start}/u     is  /[A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-ࢎࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡৰ-ৱৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౝౠ-ౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೝ-ೞೠ-ೡೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะา-ำเ-ๆກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮ-ᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽ-ꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
	// - /\p{ID_Continue}/u  is  /[0-9A-Z_a-zªµ·ºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶ-ͷͺ-ͽͿΆ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԯԱ-Ֆՙՠ-ֈ֑-ֽֿׁ-ׂׄ-ׇׅא-תׯ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺ߽ࠀ-࠭ࡀ-࡛ࡠ-ࡪࡰ-ࢇࢉ-ࢎ࢘-ࣣ࣡-ॣ०-९ॱ-ঃঅ-ঌএ-ঐও-নপ-রলশ-হ়-ৄে-ৈো-ৎৗড়-ঢ়য়-ৣ০-ৱৼ৾ਁ-ਃਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹ਼ਾ-ੂੇ-ੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ૹ-૿ଁ-ଃଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହ଼-ୄେ-ୈୋ-୍୕-ୗଡ଼-ଢ଼ୟ-ୣ୦-୯ୱஂ-ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఀ-ఌఎ-ఐఒ-నప-హ఼-ౄె-ైొ-్ౕ-ౖౘ-ౚౝౠ-ౣ౦-౯ಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕ-ೖೝ-ೞೠ-ೣ೦-೯ೱ-ೲഀ-ഌഎ-ഐഒ-ൄെ-ൈൊ-ൎൔ-ൗൟ-ൣ൦-൯ൺ-ൿඁ-ඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟ෦-෯ෲ-ෳก-ฺเ-๎๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘-༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟፩-፱ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-᜕ᜟ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲ-ᝳក-៓ៗៜ-៝០-៩᠋-᠍᠏-᠙ᠠ-ᡸᢀ-ᢪᢰ-ᣵᤀ-ᤞᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧ᪰-᪽ᪿ-ᫎᬀ-ᭌ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿ᳐-᳔᳒-ᳺᴀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‿-⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠧ꠬ꡀ-ꡳꢀ-ꣅ꣐-꣙꣠-ꣷꣻꣽ-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꧠ-ꧾꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯪ꯬-꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︯︳-︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
	// i.e. 2 extra KiB

	function validateGroupName(name) {
		return !supportsU || groupNameMatcher.test(unescape(name))
	}

	function checkRef(name) {
		const type = typeof name;
		return type === 'string' && validateGroupName(name)
		|| type === 'number' && 0 < name && Math.round(name) === name
	}

	function ref(n, depth) {
		if (!checkRef(n)) throw new SyntaxError("Bad ref: " + n)
		if ((depth != null) && (typeof depth !== 'number' || depth < 1 || (depth !== depth|0))) throw new RangeError("Bad depth: " + depth)
	    if (typeof n === 'string') return new RegExp('\\k<' + n + '>')
		const result = new RegExp('$d:' + (depth || '0')+ ",n:" + n + "^");
		metadata.set(result, {
	        direction: $direction.current,
	        hasFinalRef: true,
	        hasRefs: true,
	    });
		return result
	}

	function capture(...args) {
		$$_resetRefCapsAndFlags();
	    const res = assemble(args, false, false, 1);
		return finalize(decorate(res, {open: '('}))
	}

	function _namedCapture(name, ...args) {
		if (typeof name !== 'string') throw new TypeError("String expected, got " + typeof name)
		validateGroupName(name);
		$$_resetRefCapsAndFlags();
	    const res = assemble(args, false, false, 1);
	    return finalize(decorate(res, {open: '(?<' + name + '>'}))
	}

	function namedCapture(name, ...args) {
		return (args.length === 0
		? _namedCapture.bind(null, name)
		: _namedCapture(name, ...args))
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

	function _flags(fl, ...args) {
		// the operation is passed as context
		$$_resetRefCapsAndFlags();
	    // flags.remove throws if passed 'u' so if present here, it is to be added and the engine should know
	    // beforehand
		if (fl.indexOf('u') !== -1) $flagValidator.U = true;
		// bad hack, see _suffix
		const source = _sequence(...args);
		return finalize(source, {flagsOp: flagAdd, flags: fl})
	}

	const flags = {add: function add(flags, ...args) {
		if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
		if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
		return args.length === 0
		? _flags.bind(null, flags)
		: _flags(flags, ...args)
	}};


	// higher level functions

	function atomic(...args) {
	    return $direction.current === 1
	    // forward:
	    ? sequence(lookAhead(capture(...args)), ref(1))
	    // backward:
	    : sequence(ref(1), lookBehind(capture(...args)))
	}

	const allU = supportsU && new RegExp('[^]', 'u');
	function csDiff(a, b) {return sequence(notAhead(b), a)}
	function csInter(a, b) {return sequence(lookAhead(b), a)}
	function csComplement(a) {return csDiff((supportsU && a.unicode) ? allU : /[^]/, a)}

	const charSet = {
		difference: csDiff,
		intersection: csInter,
		complement: csComplement,
		union: either
	};

	function bound(pt) {
		throwIfNoLookBehind("bound");
		return either(
			[notBehind(pt), lookAhead(pt)],
			[lookBehind(pt), notAhead(pt)]
		)
	}
	function noBound(pt) {
		throwIfNoLookBehind("noBound");
		return either(
			[notBehind(pt), notAhead(pt)],
			[lookBehind(pt), lookAhead(pt)]
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
	exports.noBound = noBound;
	exports.notAhead = notAhead;
	exports.notBehind = notBehind;
	exports.ref = ref;
	exports.sequence = sequence;
	exports.suffix = suffix;

}));
