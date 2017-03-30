var CR = require('../')

function req(a, b) {
    if (a.source !== b.source) throw new Error ("expected " + b.source + " got " + a.source)
}
function eq(a, b) {
    if (a !== b) throw new Error("expected " + b + " got " + a)
}

var either = CR.either
var group = CR.group
var sequence = CR.sequence
var greedy = CR.greedy
var frugal = CR.frugal
var ref = CR.ref
var lookAhead = CR.lookAhead
var avoid = CR.avoid
var flags = CR.flags
var capture = CR.capture

req(either('a'), /(?:a)/)
req(either('a','b'), /(?:a|b)/)
req(either('a', 'b', 'c'), /(?:a|b|c)/)

// normalization
;[
    either, group, sequence,
    greedy('*'), frugal('+'),
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
req(sequence(/^/, 'b', /$/), /^b$/)

req(group('a'), /(?:a)/)
req(group('a', 'b'), /(?:ab)/)
req(group('a', 'b', 'c'), /(?:abc)/)

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

req(greedy('?', /foo/), /(?:foo)?/)
req(greedy('*', /foo/), /(?:foo)*/)
req(greedy('+', /foo/), /(?:foo)+/)

req(frugal('?', /foo/), /(?:foo)??/)
req(frugal('*', /foo/), /(?:foo)*?/)
req(frugal('+', /foo/), /(?:foo)+?/)

// this is a bit of a hack to take advantage of `eq` as assert equals.
req(sequence(flags('m', /o/).multiline), /true/)
req(sequence(flags('i', /o/).multiline), /false/)

;['*', '+', '?', '{2}', '{2,}', '{2,4}'].forEach(function(suffix){
    req(greedy(suffix, 'a'), {source: '(?:a)' + suffix})
    req(frugal(suffix, 'a'), {source: '(?:a)' + suffix + '?'})
    req(greedy(suffix)('a'), {source: '(?:a)' + suffix})
    req(frugal(suffix)('a'), {source: '(?:a)' + suffix + '?'})    
})

;['*', '+', '?', '{2}', '{2,}', '{2,4}'].forEach(function(suffix){
    var caught
    caught = false
    try {
        greedy(suffix + '?', 'a')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        greedy(suffix + '?')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        frugal(suffix + '?', 'a')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        frugal(suffix + '?')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

})

;['a', '5.', '{5.4}'].forEach(function(suffix){
    var caught
    caught = false
    try {
        greedy(suffix, 'a')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        greedy(suffix)
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        frugal(suffix, 'a')
    } catch (e) {
        caught = true
    }
    eq(caught, true)

    caught = false
    try {
        frugal(suffix)
    } catch (e) {
        caught = true
    }
    eq(caught, true)

})