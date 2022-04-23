import {capture, either, flags, maybe, sequence, suffix} from 'compose-regexp'

var hex = /[0-9A-Fa-f]/
const u4Escape = sequence('\\u', suffix(4, hex))
const xEscape  = sequence('\\x', suffix(2, hex))
const cEscape = sequence('\\c', /[A-Za-z]/)
const badUEscapeChars = /[^.?*+^$[\]\\(){}|\/DSWdswBbfnrtv]/
const badUCharClassEscapeChars = /[^.?*+^$[\]\\(){}|\/DSWdswfnrtv-]/
const universals = either(".", "[^]")
const openGroupOrAssertion = sequence("(", maybe("?", /[^]/))
const closeGroupOrAssertion = sequence(
    ")", 
    maybe(either(
        /[+?*]/, 
        ['{', /\d+,?\d*/, '}']
    ))
)

const uProblemDefaultMatcher = flags.add('g', either(
    u4Escape, xEscape, cEscape,
    ['\\k<', capture(/.*?/), '>'],
    ['\\', capture(badUEscapeChars)],
    ['\\', /./],
    universals,
    '[',
    capture(openGroupOrAssertion),
    capture(closeGroupOrAssertion)
))

console.log(uProblemDefaultMatcher)

const badCharSet = either(
    /\\[DSWdsw]-[^\]]/,
    /.-\\[DSWdsw]/
)

const uProblemCharClassMatcher = flags.add('g', either(
    u4Escape, xEscape, cEscape,
    ['\\', capture(badUCharClassEscapeChars)],
    // having badCharSet before the escape catch all lets its second alternative catch \w-\w and friends
    capture(badCharSet),
    ['\\', /./],
    ']'
))

console.log(uProblemCharClassMatcher)

var captureMatcher = /\\[^]|\(\?[^<]|[\[\](]/g

var numRefMatcher = /\\[^1-9]|[\[\]]|\\(\d{1,2})|\(\?:\$ \^d:(\d+),n:(\d+)\)/g

var tokenMatcher = /(\\.)|[-()|\[\]]((?=\?(?:=|!|<=|<!))?)/g

var oneEscapeOrCharClassMatcher = /^\\[^]$|^\[(?:\\[^]|[^\]])*\]$/

var pEscapeMatcher = /^\\p\{[A-Z-a-z][A-Za-z=]*\}$/

var loneBracketMatcher = /\{\d+,?\d*\}|\\[^]|\]|\[|\}/g

var dotMDotSMatcher = /\\.|\.|\(\?:\^\|\(\?<=\[\\n\\r\\u2028\\u2029\]\)\)|\(\?:\$\|\(\?=\[\\n\\r\\u2028\\u2029\]\)\)|\[|\]|\^|\$/g

var stringNormalizerMatcher = /[.?*+^$[\]\\(){}|]/g



// : (x.key.multiline && match === '^'&& supportsLookBehind) ? '(?:^|(?<=[\\n\\r\\u2028\\u2029]))'
// : (x.key.multiline && match === '$' && supportsLookBehind) ? '(?:$|(?=[\\n\\r\\u2028\\u2029]))'
