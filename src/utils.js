// Flag detection (conservatively, future flags may break our logic)
export const allFlags = []
"dgimsuy".split('').forEach(function(flag) {
	try {
		new RegExp('', flag)
		allFlags.push(flag)
	} catch(e) {}
})

// This is currently used for modern vs legacy feature detection
export const supportsU = allFlags.indexOf('u') !== -1
export const supportsLookBehind = (()=>{try {new RegExp('(?<=)'); return true} catch(e){return false}})()

export const forEach = [].forEach
export const hasOwn = ({}).hasOwnProperty
export function identity(x) {return x}
export const map = [].map
export const slice = [].slice

// Used only for type checking
// the global RegExp is used everywhere else
// This lets us set the global RegExp to a dummy function when testing,
// to ensure that our API is throwing early SyntaxErrors, not the
// RegExp constructor downstream (we have more info and can give more
// precise feedback).
export const RegExpRef = RegExp

// We decode \x.. and \u{......} escapes manually, and defer to JSON.parse
// for \u.... and surrogate pairs.
export function unescape(str) {
	return str.indexOf('\\') === -1 ? str : JSON.parse('"' + str.replace(/$|"|\\x([\dA-Fa-f]{2})|\\u\{([\dA-Fa-f]{1,6})\}/g, function(match, x, u) {
		return match === '' ? '"' // the $ match at the end
		: match === '"' ? '\\"'
		: String.fromCodePoint(parseInt(x||u, 16))
	}))
}

const propDesc = {value: void 0, writable:false, enumerable:false, configurable: false}

function randId(){return "_" + Math.floor(Math.random() * Math.pow(2,32)).toString(36)}

export const store =
(typeof WeakMap !== 'undefined') ? new WeakMap :
// degenerate WeakMap polyfill
{
	// 128 bits should be enough for everyone
	key: "__$$__compose_regexp__$$__" + randId() + randId() + randId() + randId(),
	set: function(k, v) {
		const type = typeof k
		if (k == null || type !== 'object' && type !== 'function') {throw new TypeError("Bad WeakMap key")}
		const secret = k[store.key]
		if (!secret) {
			propDesc.value = {keys:[this], values:[v]}
			Object.defineProperty(k, store.key, propDesc)
			return this
		}
		const index = secret.keys.indexOf(this)
		if (index === 0) return (secret.keys.push(this), secret.values.push(v), this)
		return (secret.values[index] = v, this)
	},
	get: function(k) {
		const secret = k[store.key]
		if (secret) {
			const index = secret.keys.indexOf(this)
			if (index !== -1) return secret.values[index]
		}
	}
}
