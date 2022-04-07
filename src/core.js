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


// Pattern parser and fixer machinery


import {allFlags, forEach, identity, map, RegExpRef, supportsU} from "./utils.js"

import {isRef} from './ref.js'


export var flagsMatcher = new RegExp('^[' + allFlags.join('') + ']*$')

var uProblemMatcher = /\\u\d{4}|\\x\d{2}|\\(.)|[\[\]]/g

var defaultEscapeMatcher = /[.?*+^$[\]\\(){}|dDsSwW-]/

var charClassEscapeMatcher = /[.?*+^$[\]\\(){}|dDsSwW]/

function hasUProblem(x) {
	var result
	var inCClass = false
	uProblemMatcher.lastIndex = 0
	while (result = uProblemMatcher.exec(x)) {
		// const [match, escapedCharacter] = result
		if (result[0] === "[") inCClass = true
		if (result[0] === "]") inCClass = false
		if (inCClass && result[1] != null && !defaultEscapeMatcher.test(result[1])) return true
		if (!inCClass && result[1] != null && !charClassEscapeMatcher.test(result[1])) return true
	}
	return false
}

var loneBracketMatcher = /\{\d+,?\d*\}|\\.|]|\[|\}|\./g

function fixLoneBrackets (x) {
	var inCClass = false
	return x.replace(loneBracketMatcher, function(match) {
		if (match === '[') inCClass = true
		if (match === ']') {
			if (inCClass) inCClass = false
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

export var flagValidator
export function initFlagValidator() {
	var U = false
	var exprs = []
	var uAtIndex = []
	var previousFlags = null
	function _check(xs) {
			forEach.call(xs, function(x) {
			if(Array.isArray(x)){_check(x)}
			if(x instanceof RegExpRef) {
				var flags = x.flags
				var hasU = flags.indexOf('u') !== -1
				var otherFlags = flags.replace('u', '').split('').sort().join('')
				if (previousFlags != null) if (otherFlags !== previousFlags) {
					throw new SyntaxError(
						"Incompatible flags: '" 
						+ (previousFlags + uAtIndex[uAtIndex.length-1] ? 'u' : '').split('').sort().join('')
						+ "' and '"+flags+"'"
					)
				}
				previousFlags = otherFlags
				exprs.push(x.source)
				if (hasU) {
					uAtIndex.push(true)
					U = true
				} else {
					uAtIndex.push(false)
				}
			}
		})
	}
	flagValidator = {
		getFlags: function(){
			// console.log("get", {isU, exprs, U})
			return U ? "u" : ''
		},
		check: function() {
			_check(arguments)
		},
		setU: function() {
			U = true
		},
		fixIfPossible: function(x) {
			if(U) {
				var i = exprs.indexOf(x.source)
				if (!uAtIndex[i]) {
					if(hasUProblem(x.source)) throw new SyntaxError("Can't upgrade the RegExp to Unicode " + x)
					return fixLoneBrackets(x.source)
				}
			}
			
			return x.source
		}
	}
}

var backRefMatcher = /\\(?!\d).|\(\?[^<]|([\[\](])|\\(\d{1,2})/g

function fixBackRefForSequences() {
	var count = 0
	return function (x) {
		if (isRef(x)) return x()
		else {
			var localCount = 0
			var inCClass = false
			var result = x.replace(backRefMatcher, function(match, sigil, num) {
				if (!inCClass) {
					if (sigil === '(') localCount += 1
					if (num != null) {
						var fixed = (Number(num) + count)
						if (fixed > 99) throw new RangeError("Too many back references")
						return '\\' + String(fixed)
					}
				}
				if (sigil === '[') inCClass = true
				if (sigil === ']') inCClass = false
				return match
			})
			count+=localCount    
			return result
		}
	}
}

export function fixBackRefForCaptures(x) {
	var inCClass = false
	return x.replace(backRefMatcher, function(match, sigil, num) {
		if (!inCClass) {
			if (num != null) {
				var fixed = (Number(num) + 1)
				if (fixed > 99) throw new RangeError("Too many back references")
				return '\\' + String(fixed)
			}
		}
		if (sigil === '[') inCClass = true
		if (sigil === ']') inCClass = false
		return match
	})
}

var tokenMatcher = /(\\.)|[-()|\[\]]/g

// When composing expressions into a sequence, regexps that have a top-level
// choice operator must be wrapped in a non-capturing group. This function
// detects whether the group is needed or not.
export function hasTopLevelChoice(source) {
	if (source.indexOf('|') === -1) return false
	var depth = 0, inCClass = false, result
	tokenMatcher.lastIndex = 0
	while(result = tokenMatcher.exec(source)) {
		// const [match, escape] = result
		if (result[1] != null) continue
		if (!inCClass && result[0] === '(') depth++
		if (!inCClass && result[0] === ')') depth--
		if (!inCClass && (result[0] === '[' || result[0] === '[-')) inCClass = true
		if (inCClass && result[0] === ']') inCClass = false
		if (depth === 0 && !inCClass && result[0] === '|') return true
	}
	return false
}

function wrapIfTopLevelChoice(source) {
	return (typeof source === 'string' && hasTopLevelChoice(source)) ? '(?:' + source + ')' : source
}

// Helper function for isAtomic
export function isOneGroup(source) {
	if (source.charAt(0) !== '(' || source.charAt(source.length - 1) !== ')') return false
	var depth = 0, inCClass = false, result
	tokenMatcher.lastIndex = 0
	while(result = tokenMatcher.exec(source)) {
		// const [match, escape] = result
		if (result[1] != null) {
			if (result.index === source.length - 2) return false
			continue
		}
		if (!inCClass && result[0] === '(') depth++
		if (!inCClass && result[0] === ')') {
			depth--
			if (depth === 0 && result.index !== source.length - 1) return false
		}
		if (!inCClass && (result[0] === '[' || result === '[-')) inCClass = true
		if (inCClass && result[0] === ']') inCClass = false
	}
	return true
}

var oneEscapeOrCharClassMatcher = /^\\[^]$|^\[(?:\\[^]|[^\]])*\]$/

var pEscapeMatcher = /^\\p\{[A-Z-a-z][A-Za-z=]*\}$/

// Determine if a pattern can take a suffix operator or if a non-capturing group
// is needed around it.
// We can safely have false negatives (consequence: useless non-capturing groups)
// whereas false positives would be bugs. We do ahve some false positives:
// some charsets will be marked as non-atomic.
export function isAtomic(source, uFlag) {
	return (
		source.length === 1 
		|| oneEscapeOrCharClassMatcher.test(source) 
		|| uFlag && pEscapeMatcher.test(source)
		// No need to look for standalone \k escapes, the are illegal in u mode, an non-atomic otherwise.
		|| isOneGroup(source)
	)
}

var groupNameMatcher = supportsU && new RegExp('^[_$\\p{ID_Start}][$\\p{ID_Continue}]*', 'u')

export function validateGroupName(name) {
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

var defaultEscapeMatcherG = /[.?*+^$[\]\\(){}|-]/g

function normalize (x) {
	// thunks are materialized downstream
	if (isRef(x)) return x
	else if (x instanceof RegExpRef) return flagValidator.fixIfPossible(x)
	var type = typeof x
	if (type !== 'number' && type !== 'string') throw new TypeError("Can't compose type " + type + " as RegExp")
	return String(x).replace(defaultEscapeMatcherG, '\\$&')
}

export function assemble(source, joiner, parentLength) {
	var length = source.length
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
	}).map(fixBackRefForSequences())
	return result.join(joiner)
}

