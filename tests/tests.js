var sane = require('../')

function eq(a, b) {
    if (a.source !== b.source) throw new Error ("expected " + b.source + " got " + a.source)
}

var either = sane.either
var group = sane.group
var sequence = sane.sequence
var greedy = sane.greedy
var frugal = sane.frugal
var ref = sane.ref
var lookAhead = sane.lookAhead
var avoid = sane.avoid
var flags = sane.flags
var capture = sane.capture

eq(either('a'), /(?:a)/)
eq(either('a','b'), /(?:a|b)/)
eq(either('a', 'b', 'c'), /(?:a|b|c)/)

// normalization
;[
    either, group, sequence,
    greedy.bind(null, '*'), frugal.bind(null, '+'),
    lookAhead, avoid,
    flags.bind(null, ''), capture
].forEach(function(m) {
    // normalization
    eq(m(/\./), m('.'))
    // empty arg list
    if (m !== capture)
        eq(m(), new RegExp(''))
    else
        eq(m(), /()/)

})

eq(sequence('a'), /a/)
eq(sequence('a', 'b'), /ab/)
eq(sequence('a', 'b', 'c'), /abc/)
eq(sequence(/^/, 'b', /$/), /^b$/)

eq(group('a'), /(?:a)/)
eq(group('a', 'b'), /(?:ab)/)
eq(group('a', 'b', 'c'), /(?:abc)/)

eq(avoid('a'), /(?!a)/)
eq(avoid('a', 'b'), /(?!ab)/)
eq(avoid('a', 'b', 'c'), /(?!abc)/)

eq(lookAhead('a'), /(?=a)/)
eq(lookAhead('a', 'b'), /(?=ab)/)
eq(lookAhead('a', 'b', 'c'), /(?=abc)/)

eq(capture('a'), /(a)/)
eq(capture('a', 'b'), /(ab)/)
eq(capture('a', 'b', 'c'), /(abc)/)

eq(ref(1), /\1/)
eq(ref(9), /\9/)

eq(greedy('?', /foo/), /(?:foo)?/)
eq(greedy('*', /foo/), /(?:foo)*/)
eq(greedy('+', /foo/), /(?:foo)+/)

eq(frugal('?', /foo/), /(?:foo)??/)
eq(frugal('*', /foo/), /(?:foo)*?/)
eq(frugal('+', /foo/), /(?:foo)+?/)

// this is a bit of a hack to take advantage of `eq` as assert equals.
eq(sequence(flags('m', /o/).multiline), /true/)
eq(sequence(flags('i', /o/).multiline), /false/)

;['*', '+', '?', '{2}', '{2,}', '{2,4}'].forEach(function(suffix){
    greedy(suffix, 'a')
    frugal(suffix, 'a')
})

;['*', '+', '?', '{2}', '{2,}', '{2,4}'].forEach(function(suffix){
    var caught
    caught = false
    try {
        greedy(suffix + '?', 'a')    
    } catch (e) {
        caught = true
    }
    eq(sequence(caught), /true/)

    caught = false
    try {
        frugal(suffix + '?', 'a')    
    } catch (e) {
        caught = true
    }
    eq(sequence(caught), /true/)

})

;['a', '5.', '{5.4}'].forEach(function(suffix){
    var caught
    caught = false
    try {
        greedy(suffix, 'a')    
    } catch (e) {
        caught = true
    }
    eq(sequence(caught), /true/)

    caught = false
    try {
        frugal(suffix, 'a')    
    } catch (e) {
        caught = true
    }
    eq(sequence(caught), /true/)

})