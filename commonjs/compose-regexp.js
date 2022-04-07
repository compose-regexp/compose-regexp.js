(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('compose-regexp', ['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.composeRegexp = {}));
})(this, (function (exports) { 'use strict';

	// Flag detection (future-proofing the lib)
	var allFlags = [];
	"abcdefghijklmnopqrstuvwxyz".split('').forEach(function(flag) {
		try {
			new RegExp('', flag);
			allFlags.push(flag);
		} catch(e) {}
	});

	// This is currently used for modern vs legacy feature detection
	var supportsU = allFlags.indexOf('u') !== -1;

	var empty = new RegExp('');


	var forEach = [].forEach;
	function identity(x) {return x}
	var map = [].map;

	// Used only for type checking
	// the global RegExp is used everywhere else
	// This lets us set the global to a dummy function when testing
	// to ensure that the API is throwing SyntaxErrors, not the 
	// RegExp constructor
	var RegExpRef = RegExp;

	function _ref(n) {
		return '\\' + (typeof n === 'number' ? String(n) : 'k<' + n + '>')
	}
	function Ref(n) {
		return Object.assign(_ref.bind(null, n), {ref: true})
	}
	function isRef(r) {
		return typeof r === 'function' && r.ref
	}

	// - - - - - - - - - - - - - - - - //


	var flagsMatcher = new RegExp('^[' + allFlags.join('') + ']*$');

	var uProblemMatcher = /\\u\d{4}|\\x\d{2}|\\(.)|[\[\]]/g;

	var defaultEscapeMatcher = /[.?*+^$[\]\\(){}|dDsSwW-]/;

	var charClassEscapeMatcher = /[.?*+^$[\]\\(){}|dDsSwW]/;

	function hasUProblem(x) {
		var result;
		var inCClass = false;
		uProblemMatcher.lastIndex = 0;
		while (result = uProblemMatcher.exec(x)) {
			// const [match, escapedCharacter] = result
			if (result[0] === "[") inCClass = true;
			if (result[0] === "]") inCClass = false;
			if (inCClass && result[1] != null && !defaultEscapeMatcher.test(result[1])) return true
			if (!inCClass && result[1] != null && !charClassEscapeMatcher.test(result[1])) return true
		}
		return false
	}

	var loneBracketMatcher = /\{\d+,?\d*\}|\\.|]|\[|\}|\./g;

	function fixLoneBrackets (x) {
		var inCClass = false;
		return x.replace(loneBracketMatcher, function(match) {
			if (match === '[') inCClass = true;
			if (match === ']') {
				if (inCClass) inCClass = false;
				else return '\\]'
			}
			if (!inCClass) {
				if(match === '}') return '\\}'
				if(match === '.') return '(?:(?![\\u{10000}-\\u{10ffff}]).)'
				// '[^\\x0a\\x0d\\u2028/u2029\\u{10000}-\\u{10ffff}]' could also
				// work and may be faster. It a tad longer though TODO: test it.
			}
			return match
		})
	}

	var flagValidator;
	function initFlagValidator() {
		var U = false;
		var exprs = [];
		var uAtIndex = [];
		var previousFlags = null;
		function _check(xs) {
				forEach.call(xs, function(x) {
				if(Array.isArray(x)){_check(x);}
				if(x instanceof RegExpRef) {
					var flags = x.flags;
					var hasU = flags.indexOf('u') !== -1;
					var otherFlags = flags.replace('u', '').split('').sort().join('');
					if (previousFlags != null) if (otherFlags !== previousFlags) {
						throw new SyntaxError(
							"Incompatible flags: '" 
							+ (previousFlags + uAtIndex[uAtIndex.length-1] ? 'u' : '').split('').sort().join('')
							+ "' and '"+flags+"'"
						)
					}
					previousFlags = otherFlags;
					exprs.push(x.source);
					if (hasU) {
						uAtIndex.push(true);
						U = true;
					} else {
						uAtIndex.push(false);
					}
				}
			});
		}
		flagValidator = {
			getFlags: function(){
				// console.log("get", {isU, exprs, U})
				return U ? "u" : ''
			},
			check: function() {
				_check(arguments);
			},
			setU: function() {
				U = true;
			},
			fixIfPossible: function(x) {
				if(U) {
					var i = exprs.indexOf(x.source);
					if (!uAtIndex[i]) {
						if(hasUProblem(x.source)) throw new SyntaxError("Can't upgrade the RegExp to Unicode " + x)
						return fixLoneBrackets(x.source)
					}
				}
				
				return x.source
			}
		};
	}

	var backRefMatcher = /\\(?!\d).|\(\?[^<]|([\[\](])|\\(\d{1,2})/g;

	function fixBackRefForSequences() {
		var count = 0;
		return function (x) {
			if (isRef(x)) return x()
			else {
				var localCount = 0;
				var inCClass = false;
				var result = x.replace(backRefMatcher, function(match, sigil, num) {
					if (!inCClass) {
						if (sigil === '(') localCount += 1;
						if (num != null) {
							var fixed = (Number(num) + count);
							if (fixed > 99) throw new RangeError("Too many back references")
							return '\\' + String(fixed)
						}
					}
					if (sigil === '[') inCClass = true;
					if (sigil === ']') inCClass = false;
					return match
				});
				count+=localCount;    
				return result
			}
		}
	}

	function fixBackRefForCaptures(x) {
		var inCClass = false;
		return x.replace(backRefMatcher, function(match, sigil, num) {
			if (!inCClass) {
				if (num != null) {
					var fixed = (Number(num) + 1);
					if (fixed > 99) throw new RangeError("Too many back references")
					return '\\' + String(fixed)
				}
			}
			if (sigil === '[') inCClass = true;
			if (sigil === ']') inCClass = false;
			return match
		})
	}

	var tokenMatcher = /(\\.)|[-()|\[\]]/g;

	// When composing expressions into a sequence, regexps that have a top-level
	// choice operator must be wrapped in a non-capturing group. This function
	// detects whether the group is needed or not.
	function hasTopLevelChoice(source) {
		if (source.indexOf('|') === -1) return false
		var depth = 0, inCClass = false, result;
		tokenMatcher.lastIndex = 0;
		while(result = tokenMatcher.exec(source)) {
			// const [match, escape] = result
			if (result[1] != null) continue
			if (!inCClass && result[0] === '(') depth++;
			if (!inCClass && result[0] === ')') depth--;
			if (!inCClass && (result[0] === '[' || result[0] === '[-')) inCClass = true;
			if (inCClass && result[0] === ']') inCClass = false;
			if (depth === 0 && !inCClass && result[0] === '|') return true
		}
		return false
	}

	function wrapIfTopLevelChoice(source) {
		return (typeof source === 'string' && hasTopLevelChoice(source)) ? '(?:' + source + ')' : source
	}

	// Helper function for isAtomic
	function isOneGroup(source) {
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
	}

	var oneEscapeOrCharClassMatcher = /^\\[^]$|^\[(?:\\[^]|[^\]])*\]$/;

	var pEscapeMatcher = /^\\p\{[A-Z-a-z][A-Za-z=]*\}$/;

	// Determine if a pattern can take a suffix operator or if a non-capturing group
	// is needed around it.
	// We can safely have false negatives (consequence: useless non-capturing groups)
	// whereas false positives would be bugs. We do ahve some false positives:
	// some charsets will be marked as non-atomic.
	function isAtomic(source, uFlag) {
		return (
			source.length === 1 
			|| oneEscapeOrCharClassMatcher.test(source) 
			|| uFlag && pEscapeMatcher.test(source)
			// No need to look for standalone \k escapes, the are illegal in u mode, an non-atomic otherwise.
			|| isOneGroup(source)
		)
	}

	var groupNameMatcher = supportsU && new RegExp('^[_$\\p{ID_Start}][$\\p{ID_Continue}]*', 'u');

	function validateGroupName(name) {
		return groupNameMatcher.test(name)
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

	var defaultEscapeMatcherG = /[.?*+^$[\]\\(){}|-]/g;

	function normalize (x) {
		// thunks are materialized downstream
		if (isRef(x)) return x
		else if (x instanceof RegExpRef) return flagValidator.fixIfPossible(x)
		var type = typeof x;
		if (type !== 'number' && type !== 'string') throw new TypeError("Can't compose type " + type + " as RegExp")
		return String(x).replace(defaultEscapeMatcherG, '\\$&')
	}

	function assemble(source, joiner, parentLength) {
		var length = source.length;
		if (length === 0) return ''
		var result = map.call(source, function(item) {
			if (isRef(item)) return item
			// the predicate probably isn't right, it was whackamoled
			// there must be a more elegant way...
			return ((joiner === '' && (length !== 1 || parentLength !== 1)) ? wrapIfTopLevelChoice : identity)(
				Array.isArray(item)
				? assemble(item, '', length)
				: normalize(item)
			)
		}).map(fixBackRefForSequences());
		return result.join(joiner)
	}

	function either() {
		if (!arguments.length) return empty
		initFlagValidator();
		flagValidator.check.apply(null, arguments);
		return new RegExp(assemble(arguments, '|', 1), flagValidator.getFlags())
	}

	function _sequence() {
		flagValidator.check.apply(null, arguments);
		return assemble(arguments, '', 1)
	}

	function sequenceFactory (before, after) {
		return function () {
			if (!arguments.length) return empty
			initFlagValidator();
			return new RegExp(before + _sequence.apply(null, arguments) + after, flagValidator.getFlags())
		}
	}

	var sequence = sequenceFactory("", "");
	var lookAhead = sequenceFactory('(?=', ')');
	var avoid = sequenceFactory('(?!', ')');
	var lookBehind = sequenceFactory('(?<=', ')');
	var notBehind = sequenceFactory('(?<!', ')');

	var suffixMatcher = /^(?:\+|\*|\?|\{(?=(\d+))\1(?=(,?))\2(?=(\d*))\3\})\??$/;

	var call = _suffix.call;

	function _suffix(operator) {
		if (arguments.length === 1) return empty
		initFlagValidator(); 
		// an attrocious hack to pass all arguements but the operator to `_sequence()`
		// without allocating an array. The operator is passed as `this` which is ignored.
		var res = call.apply(_sequence, arguments);
		var u = flagValidator.getFlags();
		return new RegExp(isAtomic(res, u.indexOf('u') !== -1) ? res + operator : '(?:' + res + ')' + operator, u)
	}

	function suffix(suffix) {
		if (!suffixMatcher.test(suffix)) throw new SyntaxError("Invalid suffix '" + suffix+ "'.")
		return arguments.length === 1
		? _suffix.bind(null, suffix)
		: _suffix.apply(null, arguments)
	}

	var maybe = suffix('?');

	function checkRef(name) {
		var type = typeof name;
		return type === 'string' && validateGroupName(name) 
		|| type === 'number' && name > 0 && Math.round(name) === name
	}

	function ref(n) {
		if (!checkRef(n)) throw new TypeError("Bad ref")
		return Ref(n)
	}

	function capture () {
		if (!arguments.length) return new RegExp('()')
		initFlagValidator();
		return new RegExp(
			'(' + fixBackRefForCaptures(_sequence.apply(null, arguments)) + ')',
			flagValidator.getFlags()
		)
	}

	function _namedCapture(name) {
		if (typeof name !== 'string') throw new TypeError("String expected, got " + typeof name)
		validateGroupName(name);
		if (!arguments.length) return new RegExp('(<'+name+')')
		initFlagValidator();
		return new RegExp(
			'(?<' + name + '>' + fixBackRefForCaptures(call.apply(_sequence, arguments)) + ')',
			flagValidator.getFlags()
		)
	}

	function namedCapture(name) {
		return (arguments.length === 1
		? _namedCapture.bind(null, name)
		: _namedCapture.apply(null, arguments))
	}

	function atomic() {
		return sequence(lookAhead(capture.apply(null, arguments)), ref(1))
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

	function add(a, b) {
		a = a.split('');
		b = b.split('');
		b.forEach(function(flag){if (a.indexOf(flag) === -1) a.push(flag);});
		return a.sort().join('')
	}

	function remove(a, b) {
		a = a.split('');
		b = b.split('');
		return a.filter(function(flag){return b.indexOf(flag) === -1}).sort().join('')
	}

	function _flags(fl) {
		initFlagValidator();
		// force bad escape detection for promotion
		if (fl.indexOf('u') !== -1) flagValidator.setU();
		// bad hack, see _suffix
		var source = call.apply(_sequence, arguments);
		return new RegExp(source, add(fl, flagValidator.getFlags()))
	}

	function flags(flags) {
		if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
		if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
		return arguments.length === 1
		? _flags.bind(null, flags)
		: _flags.apply(null, arguments)
	}

	function _flagsOp(fl, re) {
		// the operation is passed as context
		if (arguments.length > 2) throw new RangeError("flags." + this.name + "() expects at most two arguments")
		initFlagValidator();
		var original = (re && re.flags) || '';
		if (fl.indexOf('u') !== -1) flagValidator.setU();
		// bad hack, see _suffix
		var source = call.apply(_sequence, arguments);
		return new RegExp(source, add(this(original, fl), flagValidator.getFlags()))
	}

	flags.add = function(flags) {
		if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
		if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
		return arguments.length === 1
		? _flagsOp.bind(add, flags)
		: _flagsOp.apply(add, arguments)
	};

	flags.remove = function(flags) {
		if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
		// No validiy checks here, we're not adding anything.
		return arguments.length === 1
		? _flagsOp.bind(remove, flags)
		: _flagsOp.apply(remove, arguments)
	};

	// TODO Set operations

	// var rangeCache = {}

	// var hex = /[0-9A-Fa-f]/

	// const elementsU = either(
	//     ['\\p{', capture(), '}'],
	//     /\\p\{\w+\}/,
	//     /\\u[0-9A-Fa-f]{4}/,
	//     /\\u\{[0-9A-Fa-f]{1,6}\}/,
	//     /\\x[0-9A-Fa-f]{2}/,
	//     /\\./,
	//     /./
	// )

	// const range = sequence(element, '-', element)

	// var charSetValidator = flags("g")

	exports.atomic = atomic;
	exports.avoid = avoid;
	exports.capture = capture;
	exports.either = either;
	exports.flags = flags;
	exports.lookAhead = lookAhead;
	exports.lookBehind = lookBehind;
	exports.maybe = maybe;
	exports.namedCapture = namedCapture;
	exports.notBehind = notBehind;
	exports.ref = ref;
	exports.sequence = sequence;
	exports.suffix = suffix;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
