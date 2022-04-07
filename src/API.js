
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

import {empty} from './utils.js'

import {assemble, fixBackRefForCaptures, flagsMatcher, flagValidator, initFlagValidator, isAtomic, validateGroupName} from './core.js'

import {Ref} from './ref.js'


export function either() {
	if (!arguments.length) return empty;
	initFlagValidator()
	flagValidator.check.apply(null, arguments)
	return new RegExp(assemble(arguments, '|', 1), flagValidator.getFlags())
}

function _sequence() {
	flagValidator.check.apply(null, arguments)
	return assemble(arguments, '', 1)
}

function sequenceFactory (before, after) {
	return function () {
		if (!arguments.length) return empty;
		initFlagValidator()
		return new RegExp(before + _sequence.apply(null, arguments) + after, flagValidator.getFlags())
	}
}

export var sequence = sequenceFactory("", "")
export var lookAhead = sequenceFactory('(?=', ')')
export var avoid = sequenceFactory('(?!', ')')
export var lookBehind = sequenceFactory('(?<=', ')')
export var notBehind = sequenceFactory('(?<!', ')')

var suffixMatcher = /^(?:\+|\*|\?|\{(?=(\d+))\1(?=(,?))\2(?=(\d*))\3\})\??$/

var call = _suffix.call

function _suffix(operator) {
	if (arguments.length === 1) return empty
	initFlagValidator() 
	// an attrocious hack to pass all arguements but the operator to `_sequence()`
	// without allocating an array. The operator is passed as `this` which is ignored.
	var res = call.apply(_sequence, arguments)
	var u = flagValidator.getFlags()
	return new RegExp(isAtomic(res, u.indexOf('u') !== -1) ? res + operator : '(?:' + res + ')' + operator, u)
}

export function suffix(suffix) {
	if (!suffixMatcher.test(suffix)) throw new SyntaxError("Invalid suffix '" + suffix+ "'.")
	return arguments.length === 1
	? _suffix.bind(null, suffix)
	: _suffix.apply(null, arguments)
}

export var maybe = suffix('?')

function checkRef(name) {
	var type = typeof name
	return type === 'string' && validateGroupName(name) 
	|| type === 'number' && name > 0 && Math.round(name) === name
}

export function ref(n) {
	if (!checkRef(n)) throw new TypeError("Bad ref")
	return Ref(n)
}

export function capture () {
	if (!arguments.length) return new RegExp('()');
	initFlagValidator()
	return new RegExp(
		'(' + fixBackRefForCaptures(_sequence.apply(null, arguments)) + ')',
		flagValidator.getFlags()
	)
}

function _namedCapture(name) {
	if (typeof name !== 'string') throw new TypeError("String expected, got " + typeof name)
	validateGroupName(name)
	if (!arguments.length) return new RegExp('(<'+name+')');
	initFlagValidator()
	return new RegExp(
		'(?<' + name + '>' + fixBackRefForCaptures(call.apply(_sequence, arguments)) + ')',
		flagValidator.getFlags()
	)
}

export function namedCapture(name) {
	return (arguments.length === 1
	? _namedCapture.bind(null, name)
	: _namedCapture.apply(null, arguments))
}

export function atomic() {
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
	a = a.split('')
	b = b.split('')
	b.forEach(function(flag){if (a.indexOf(flag) === -1) a.push(flag)})
	return a.sort().join('')
}

function remove(a, b) {
	a = a.split('')
	b = b.split('')
	return a.filter(function(flag){return b.indexOf(flag) === -1}).sort().join('')
}

function _flags(fl) {
	initFlagValidator()
	// force bad escape detection for promotion
	if (fl.indexOf('u') !== -1) flagValidator.setU()
	// bad hack, see _suffix
	var source = call.apply(_sequence, arguments)
	return new RegExp(source, add(fl, flagValidator.getFlags()))
}

export function flags(flags) {
	if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
	if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
	return arguments.length === 1
	? _flags.bind(null, flags)
	: _flags.apply(null, arguments)
}

function _flagsOp(fl, re) {
	// the operation is passed as context
	if (arguments.length > 2) throw new RangeError("flags." + this.name + "() expects at most two arguments")
	initFlagValidator()
	var original = (re && re.flags) || ''
	if (fl.indexOf('u') !== -1) flagValidator.setU()
	// bad hack, see _suffix
	var source = call.apply(_sequence, arguments)
	return new RegExp(source, add(this(original, fl), flagValidator.getFlags()))
}

flags.add = function(flags) {
	if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
	if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
	return arguments.length === 1
	? _flagsOp.bind(add, flags)
	: _flagsOp.apply(add, arguments)
}

flags.remove = function(flags) {
	if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
	// No validiy checks here, we're not adding anything.
	return arguments.length === 1
	? _flagsOp.bind(remove, flags)
	: _flagsOp.apply(remove, arguments)
}

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