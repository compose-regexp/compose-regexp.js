var CR = require('../')

function req(a, b) {
    if (a.source !== b.source) throw new Error ("expected " + b.source + " got " + a.source)
}
function eq(a, b) {
    if (a !== b) throw new Error("expected " + b + " got " + a)
}

var either = CR.either
var sequence = CR.sequence
var suffix = CR.suffix
var ref = CR.ref
var lookAhead = CR.lookAhead
var avoid = CR.avoid
var flags = CR.flags
var capture = CR.capture

req(either('a'), /a/)
req(either('a','b'), /a|b/)
req(either('a', 'b', 'c'), /a|b|c/)

// normalization
;[
    either, sequence,
    suffix('*'),
    lookAhead, avoid,
    flags.bind(null, ''), capture
].forEach(function(m) {
    // normalization
    req(m(/\./), m('.'))
    // empty arg list
    if (m !== capture)
        req(m(), new RegExp(''))
    else
        req(m(), /()/)

})

req(sequence('a'), /a/)
req(sequence('a', 'b'), /ab/)
req(sequence('a', 'b', 'c'), /abc/)
req(sequence('a', /b|c/), /a(?:b|c)/)
req(sequence(/^/, 'b', /$/), /^b$/)
req(sequence(/a|b/), /a|b/)
req(either(sequence(sequence(/a|b/))), /a|b/)



req(avoid('a'), /(?!a)/)
req(avoid('a', 'b'), /(?!ab)/)
req(avoid('a', 'b', 'c'), /(?!abc)/)

req(lookAhead('a'), /(?=a)/)
req(lookAhead('a', 'b'), /(?=ab)/)
req(lookAhead('a', 'b', 'c'), /(?=abc)/)

req(capture('a'), /(a)/)
req(capture('a', 'b'), /(ab)/)
req(capture('a', 'b', 'c'), /(abc)/)

req(ref(1), /\1/)
req(ref(9), /\9/)

req(suffix('?', /foo/), /(?:foo)?/)
req(suffix('*', /foo/), /(?:foo)*/)
req(suffix('+', /foo/), /(?:foo)+/)

// this is a bit of a hack to take advantage of `eq` as assert equals.
req(sequence(flags('m', /o/).multiline), /true/)
req(sequence(flags('i', /o/).multiline), /false/)

;[
    '*', '+', '?', '{2}', '{2,}', '{2,4}',
    '*?', '+?', '??', '{2}?', '{2,}?', '{2,4}?',
].forEach(function(op){
    req(suffix(op, 'a'), {source: 'a' + op})
    req(suffix(op, /a|b/), {source: '(?:a|b)' + op})
    req(suffix(op, /(a)b/), {source: '(?:(a)b)' + op})
    req(suffix(op)('a'), {source: 'a' + op})
})

;['a', '5.', '{5.4}'].forEach(function(op){
    var caught
    caught = false
    try {
        suffix(op, 'a')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        suffix(op)
    } catch (e) {
        caught = true
    }
    eq(caught, true)
})