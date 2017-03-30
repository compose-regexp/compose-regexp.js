var empty = new RegExp('')

function normalize (source) {
    if (source instanceof RegExp) return source.source
    else return (source+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")
}

// TODO investigate -] in charSets for isSequential and forSequence
var tokenMatcher = /(\\[^])|[-()|\[\]]|\[\-/g

function isSequential(source) {
    if (source.indexOf('|') === -1) return true
    var depth = 0, inCharSet = false, match
    tokenMatcher.lastIndex = 0
    while(match = tokenMatcher.exec(source)) {
        if (match[1] != null) continue
        if (!inCharSet && match[0] === '(') depth++
        if (!inCharSet && match[0] === ')') depth--
        if (!inCharSet && (match[0] === '[' || match[0] === '[-')) inCharSet = true
        if (inCharSet && match === ']') inCharSet = false
        if (depth === 0 && !inCharSet && match[0] === '|') return false
    }
    return true
}

function isOneGroup(source) {
    if (source.charAt(0) !== '(' || source.charAt(source.length - 1) !== ')') return false
    var depth = 0, inCharSet = false, match
    tokenMatcher.lastIndex = 0
    while(match = tokenMatcher.exec(source)) {
        if (match[1] != null) {
            if (match.index === source.length - 2) return false
            continue
        }
        if (!inCharSet && match[0] === '(') depth++
        if (!inCharSet && match[0] === ')') {
            depth--
            if (depth === 0 && match.index !== source.length - 1) return false
        }
        if (!inCharSet && (match[0] === '[' || match === '[-')) inCharSet = true
        if (inCharSet && match[0] === ']') inCharSet = false
    }
    return true
}

function forSequence(source) {
    source = normalize(source)
    return isSequential(source) ? source : '(?:' + source + ')'
}

function isAtomic(source) {
    // we're sligtly too conservative here. Some charsets will be marked as non-atomic
    return source.length === 1 || /^\\[^]$|^\[(?:\\[^]|[^\]])*\]$/.test(source) || isOneGroup(source)
}

export function either() {
    if (!arguments.length) return empty;
    return new RegExp([].map.call(arguments, normalize).join('|'))
}

export function sequence() {
    if (!arguments.length) return empty;
    return new RegExp([].map.call(arguments, forSequence).join(''))
}

var validSuffix = sequence(
    /^/,
    either(
        '+', '*', '?',
        /\{\s*\d+(?:\s*,\s*)?\d*\s*\}/
    ),
    /$/
)

var call = operator.call
var push = [].push
function operator(suffix) {
    if (arguments.length === 1) return empty
    var res = call.apply(sequence, arguments).source
    return new RegExp(isAtomic(res) ? res + suffix : '(?:' + res + ')' + suffix)
}

export function greedy(suffix) {
    if (!validSuffix.test(suffix)) throw new Error("Invalid suffix '" + suffix+ "'.")
    return (arguments.length === 1)
        ? operator.bind(null, suffix)
        : operator.apply(null, arguments)
}

export function frugal(suffix) {
    if (!validSuffix.test(suffix)) throw new Error("Invalid suffix '" + suffix+ "'.")
    return (arguments.length === 1)
        ? operator.bind(null, suffix+'?')
        : (arguments[0] = suffix + '?', operator.apply(null, arguments))
}

export function ref(n) {
    return new RegExp('\\' + n)
}

export function lookAhead() {
    if (!arguments.length) return empty;
    return new RegExp('(?=' + [].map.call(arguments, forSequence).join('') + ')')
}

export function avoid() {
    if (!arguments.length) return empty;
    return new RegExp('(?!' + [].map.call(arguments, forSequence).join('') + ')')
}

export function flags(opts) {
    var args = [].slice.call(arguments, 1)
    var expr
    if (!args.length) expr = '';
    else expr = args.map(forSequence).join('')
    return new RegExp(expr, opts)
}

export function capture () {
    if (!arguments.length) return new RegExp('()');
    return new RegExp('(' + [].map.call(arguments, forSequence).join('') + ')')
}