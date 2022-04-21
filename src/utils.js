// Flag detection (conservatively, future flags may break our logic)
export var allFlags = []
"dgimsuy".split('').forEach(function(flag) {
	try {
		new RegExp('', flag)
		allFlags.push(flag)
	} catch(e) {}
})

// This is currently used for modern vs legacy feature detection
export var supportsU = allFlags.indexOf('u') !== -1
export var canFoldM = false
try {new RegExp('(?<=)'); canFoldM = true} catch(e){}

export var forEach = [].forEach
export var hasOwn = ({}).hasOwnProperty
export function identity(x) {return x}
export var map = [].map
export var slice = [].slice

// Used only for type checking
// the global RegExp is used everywhere else
// This lets us set the global RegExp to a dummy function when testing,
// to ensure that the API is throwing SyntaxErrors, not the
// RegExp constructor downstream.
export var RegExpRef = RegExp

// We decode \x.. and \u{......} escapes manually, and defer to JSON.parse
// for \u.... and surrogate pairs.
export function unescape(str) {
	return str.indexOf('\\') === -1 ? str : JSON.parse('"' + str.replace(/$|"|\\x([\dA-Fa-f]{2})|\\u\{([\dA-Fa-f]{1,6})\}/g, function(match, x, u) {
		return match === '' ? '"' // the $ match at the end
		: match === '"' ? '\\"'
		: String.fromCodePoint(parseInt(x||u, 16))
	}))
}

var propDesc = {value: void 0, writable:false, enumerable:false, configurable: false}

function randId(){return "_" + Math.floor(Math.random() * Math.pow(2,32)).toString(36)}

export var store = 
// (typeof WeakMap !== 'undefined') ? new WeakMap : 
// degenerate WeakMap polyfill
{
	// 128 bits should be enough for everyone
	key: "__$$__compose_regexp__$$__" + randId() + randId() + randId() + randId(),
	set: function(k, v) {
		var type = typeof k
		if (k == null || type !== 'object' && type !== 'function') {throw new TypeError("Bad WeakMap key")}
		var secret = k[store.key]
		if (!secret) {
			propDesc.value = {keys:[this], values:[v]}
			Object.defineProperty(k, store.key, propDesc)
			return this
		}
		var index = secret.keys.indexOf(this)
		if (index === 0) return (secret.keys.push(this), secret.values.push(v), this)
		return (secret.values[index] = v, this)
	},
	get: function(k) {
		var secret = k[store.key]
		if (secret) {
			var index = secret.keys.indexOf(this)
			if (index !== -1) return secret.values[index]
		}
	}
}
