// Flag detection (future-proofing the lib)
export var allFlags = []
"abcdefghijklmnopqrstuvwxyz".split('').forEach(function(flag) {
	try {
		new RegExp('', flag)
		allFlags.push(flag)
	} catch(e) {}
})

// This is currently used for modern vs legacy feature detection
export var supportsU = allFlags.indexOf('u') !== -1

export var empty = new RegExp('')
var emptyU = supportsU ? new RegExp('', 'u') : void 0


export var forEach = [].forEach
export function identity(x) {return x}
export var map = [].map

// Used only for type checking
// the global RegExp is used everywhere else
// This lets us set the global to a dummy function when testing
// to ensure that the API is throwing SyntaxErrors, not the
// RegExp constructor
export var RegExpRef = RegExp
