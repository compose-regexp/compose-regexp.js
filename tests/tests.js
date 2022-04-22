import o from 'ospec'

// This must happen before importing the lib
import {nullProto, r} from '../test-utils/utils.js'

import {
	atomic, notAhead, bound, capture, charSet, either,
	flags, lookAhead, lookBehind, namedCapture,
	notBehind, ref, sequence, suffix
} from '../compose-regexp.js'

import {isDisjunction} from '../src/core.js'

// import {store} from '../src/utils.js'

// TODO([
// 	"test metadata ?"
// ])

o.spec("general", function () {
	// throw new Error("GAZAR");
	o('string and a lack of arguments are normalized', function(){
		void [
			either, sequence,
			lookAhead, notAhead,
			flags.add(''), capture
		].forEach(function(f) {
			// normalization
			o(f(/\./))
			.satisfies(r(f('.')))

			o(f(/-/))
			.satisfies(r(f('-')))

			// empty arg list
			if (f !== capture)
				o(f())
			.satisfies(r(new RegExp('')))

			else
				o(f())
			.satisfies(r(/()/))

		})
	})
})

o('either', function() {
	o(either('a'))
	.satisfies(r(/a/))

	o(either('a','b'))
	.satisfies(r(/a|b/))

	o(either('a', 'b', 'c'))
	.satisfies(r(/a|b|c/))

	o(either('a', either('b', 'c')))
	.satisfies(r(/a|b|c/))

	o(either('a', either(/b|c/)))
	.satisfies(r(/a|b|c/))

	o(either(either(either('a', 'b'))))
	.satisfies(r(/a|b/))

	o(either(either(either(/a|b/))))
	.satisfies(r(/a|b/))

})

o('sequence', function() {
	o(sequence(''))
	.satisfies(r(/(?:)/))

	o(sequence('a'))
	.satisfies(r(/a/))

	o(sequence('a', 'b'))
	.satisfies(r(/ab/))

	o(sequence('a', 'b', 'c'))
	.satisfies(r(/abc/))

	o(sequence('a', /b|c/))
	.satisfies(r(/a(?:b|c)/))

	o(sequence(/^/, 'b', /$/))
	.satisfies(r(/^b$/))

	o(sequence(/a|b/))
	.satisfies(r(/a|b/))

	o(either(sequence(sequence(/a|b/))))
	.satisfies(r(/a|b/))

	o(sequence('thingy', either(/[a]/, /b/)))
	.satisfies(r(/thingy(?:[a]|b)/))

	o(sequence(/a/i, /b/i))
	.satisfies(r(/ab/i))

})

o('notAhead', function(){
	o(notAhead('a'))
	.satisfies(r(/(?!a)/))

	o(notAhead('a', 'b'))
	.satisfies(r(/(?!ab)/))

	o(notAhead('a', 'b', 'c'))
	.satisfies(r(/(?!abc)/))

})

o('lookAhead', function(){
	o(lookAhead('a'))
	.satisfies(r(/(?=a)/))

	o(lookAhead('a', 'b'))
	.satisfies(r(/(?=ab)/))

	o(lookAhead('a', 'b', 'c'))
	.satisfies(r(/(?=abc)/))

})

o.spec("Look Behind", function() {
})


o('capture', function(){
	o(capture('a'))
	.satisfies(r(/(a)/))

	o(capture('a', 'b'))
	.satisfies(r(/(ab)/))

	o(capture('a', /b/, 'c'))
	.satisfies(r(/(abc)/))

})

o.spec('nested arrays', function(){
	o('works', function() {
		o(either(['a', /./], ['b', /\w/]))
		.satisfies(r(/a.|b\w/))

	})
	o("won't pile up escapes", function() {
		o(sequence([/\//])).satisfies(r(/\//))

		o(either([/\//])).satisfies(r(/\//))

	})
})

o.spec("flags", function () {
	o('basics', function(){
		var flagKinds = {
			g: 'global',
			i: 'ignoreCase',
			m: 'multiline'
		}
		void [['s', 'dotAll'], ['u', 'unicode'], ['y', 'sticky']].forEach(function(pair){
			try {
				new RegExp('', pair[0])
				flagKinds[pair[0]] = pair[1]
			} catch(e) {}
		})
		for (var k in flagKinds) {
			o(flags.add(k, /o/)[flagKinds[k]]).equals(true)
			o(flags.add(k)(/o/)[flagKinds[k]]).equals(true)
			for (var kk in flagKinds) if (k !== kk) {
				o(flags.add(kk, /o/)[flagKinds[k]]).equals(false)
				o(flags.add(kk)(/o/)[flagKinds[k]]).equals(false)
			}
		}
		o(flags.add('m', /o/).multiline).equals(true)
		o(flags.add('i', /o/).multiline).equals(false)

	})

	o("illegal flags throw", function () {
		// find an illegal flag
		let illegal
		"abcdefghijklmnopqrstuvwxyz".split('').some(function(f){
			try {
				new RegExp('', f)
				return false
			} catch(e) {
				illegal = f
				return true
			}
		})

		o(()=>flags.add(illegal)).throws(SyntaxError)

	})

	o("mixed flags ", function () {
		o(()=>sequence(/./, /./i)).throws(Error)
		o(()=>sequence(/./i, /./g)).throws(Error)

		o(sequence(/a/, /a/u))
		.satisfies(r(/aa/u))

		o(sequence(/a/u, /a/))
		.satisfies(r(/aa/u))

		o(sequence(/a/, /a/u, /a/s))
		.satisfies(r(/aaa/u))

		o(sequence(/a/, /a/u, /a/s))
		.satisfies(r(/aaa/u))

		o(sequence(/a/u, /a/s, /a/))
		.satisfies(r(/aaa/u))

		o(sequence(/a/s, /a/, /a/u))
		.satisfies(r(/aaa/u))

	})

	o("s flag is absorbed, dot converted", function() {
		o(sequence(/./s))
		.satisfies(r(/[^]/))

		o(sequence(/./su))
		.satisfies(r(/[^]/u))

		o(sequence('a', /./s))
		.satisfies(r(/a[^]/))

		o(sequence('a', /./su))
		.satisfies(r(/a[^]/u))

		o(sequence(/a/, /./s))
		.satisfies(r(/a[^]/))

		o(sequence(/a/, /./su))
		.satisfies(r(/a[^]/u))

		o(sequence(/(.)/s, ref(1)))
		.satisfies(r(/([^])\1/))

		o(sequence(/(.)/su, ref(1)))
		.satisfies(r(/([^])\1/u))


		o(sequence(/\./s))
		.satisfies(r(/\./))

		o(sequence(/\./su))
		.satisfies(r(/\./u))

		o(sequence('a', /\./s))
		.satisfies(r(/a\./))

		o(sequence('a', /\./su))
		.satisfies(r(/a\./u))

		o(sequence(/a/, /\./s))
		.satisfies(r(/a\./))

		o(sequence(/a/, /\./su))
		.satisfies(r(/a\./u))

		o(sequence(/(\.)/s, ref(1)))
		.satisfies(r(/(\.)\1/))

		o(sequence(/(\.)/su, ref(1)))
		.satisfies(r(/(\.)\1/u))


		o(sequence(/[.]/s))
		.satisfies(r(/[.]/))

		o(sequence(/[.]/su))
		.satisfies(r(/[.]/u))

		o(sequence('a', /[.]/s))
		.satisfies(r(/a[.]/))

		o(sequence('a', /[.]/su))
		.satisfies(r(/a[.]/u))

		o(sequence(/a/, /[.]/s))
		.satisfies(r(/a[.]/))

		o(sequence(/a/, /[.]/su))
		.satisfies(r(/a[.]/u))

		o(sequence(/([.])/s, ref(1)))
		.satisfies(r(/([.])\1/))

		o(sequence(/([.])/su, ref(1)))
		.satisfies(r(/([.])\1/u))

	})

	o("the m flag is absorbed, ^ and $ converted, but only once", function() {
		o(sequence(/^/m))
		.satisfies(r((/(?:^|(?<=[\n\r\u2028\u2029]))/)))

		o(sequence(/$/m))
		.satisfies(r((/(?:$|(?=[\n\r\u2028\u2029]))/)))

		o(sequence(/[^$]/m))
		.satisfies(r(/[^$]/))

		o(sequence(flags.add('m', sequence(/^/m))))
		.satisfies(r((/(?:^|(?<=[\n\r\u2028\u2029]))/)))

		o(sequence(flags.add('m', sequence(/$/m))))
		.satisfies(r((/(?:$|(?=[\n\r\u2028\u2029]))/)))
	})

	o.spec("u flag", function() {

			o("flag('u',...) rejects invalid non-u sources", function() {
				// Make sure we are the ones throwing
				const R = RegExp
				RegExp = function(){}
				try {
					o(()=>flags.add('u', /\a/)).throws(SyntaxError)
					o(()=>flags.add('u', /\-/)).throws(SyntaxError)
					o(()=>flags.add('u', /\u1/)).throws(SyntaxError)
					o(()=>flags.add('u', /\x1/)).throws(SyntaxError)
					o(()=>flags.add('u', /\u12/)).throws(SyntaxError)
					o(()=>flags.add('u', /\u123/)).throws(SyntaxError)
					o(()=>flags.add('u', /((?=())+)/)).throws(SyntaxError)
				} finally {
					RegExp = R
				}

			})

			o("several u", function () {
			o(sequence(/a/u, /b/u))
			.satisfies(r(/ab/u))

			o(sequence(/a/u, /b/u, /c/u))
			.satisfies(r(/abc/u))

			o(either(/a/u, /b/u))
			.satisfies(r(/a|b/u))

			o(either(/a/u, /b/u, /c/u))
			.satisfies(r(/a|b|c/u))

			o(suffix("*", /a/u, /b/u))
			.satisfies(r(/(?:ab)*/u))

			o(suffix("*", /a/u, /b/u, /c/u))
			.satisfies(r(/(?:abc)*/u))

			o(notAhead(/a/u, /b/u))
			.satisfies(r(/(?!ab)/u))

			o(notAhead(/a/u, /b/u, /c/u))
			.satisfies(r(/(?!abc)/u))

			o(lookAhead(/a/u, /b/u))
			.satisfies(r(/(?=ab)/u))

			o(lookAhead(/a/u, /b/u, /c/u))
			.satisfies(r(/(?=abc)/u))

		})
		o("u contagiosity", function() {
			o(sequence(/a/u, /b/))
			.satisfies(r(/ab/u))

			o(sequence(/(?<r>a)/u, ref('r')))
			.satisfies(r(/(?<r>a)\k<r>/u))

			o(sequence(/a/u, /b/u, /c/))
			.satisfies(r(/abc/u))

			o(either(/a/, /b/u))
			.satisfies(r(/a|b/u))

			o(either(/a/, /b/u, /c/u))
			.satisfies(r(/a|b|c/u))

			o(suffix("*", /a/, /b/u))
			.satisfies(r(/(?:ab)*/u))

			o(suffix("*", /a/u, /b/, /c/u))
			.satisfies(r(/(?:abc)*/u))

			o(notAhead(/a/u, /b/))
			.satisfies(r(/(?!ab)/u))

			o(notAhead(/a/, /b/u, /c/u))
			.satisfies(r(/(?!abc)/u))

			o(lookAhead(/a/u, /b/))
			.satisfies(r(/(?=ab)/u))

			o(lookAhead(/a/u, /b/, /c/u))
			.satisfies(r(/(?=abc)/u))

			o(lookBehind(/a/u, /b/))
			.satisfies(r(/(?<=ab)/u))

			o(lookBehind(/a/u, /b/, /c/u))
			.satisfies(r(/(?<=abc)/u))

			o(notBehind(/a/u, /b/))
			.satisfies(r(/(?<!ab)/u))

			o(notBehind(/a/u, /b/, /c/u))
			.satisfies(r(/(?<!abc)/u))

		})

		o("ascci and unicode escapes are passed through", function () {
			o(sequence(/a/u, /\w\s\W\S\d\D \f\n\r\t\v\b\B\/\cA/))
			.satisfies(r(/a\w\s\W\S\d\D \f\n\r\t\v\b\B\/\cA/u))

			o(sequence(/a/u, /[\w\s\W\S\d\D \f\n\r\t\v\/\cA]/))
			.satisfies(r(/a[\w\s\W\S\d\D \f\n\r\t\v\/\cA]/u))

			o(sequence(/a/u, /\x12/))
			.satisfies(r(/a\x12/u))

			o(sequence(/a/u, /[\x12]/))
			.satisfies(r(/a[\x12]/u))

			o(sequence(/a/u, /\u1234/))
			.satisfies(r(/a\u1234/u))

			o(sequence(/a/u, /[\u1234]/))
			.satisfies(r(/a[\u1234]/u))

		})


		o("bad escapes, . and [^] can't be upgraded", function() {
			o(sequence(/./u, /b/))
			.satisfies(r(/.b/u))

			o(sequence(/[^]/u, /b/))
			.satisfies(r(/[^]b/u))

			o(sequence(/a/u, /\+/))
			.satisfies(r(/a\+/u))

			o(sequence(/a/u, /[\-]/))
			.satisfies(r(/a[\-]/u))

			o(sequence(/a/u, /[\w-]/))
			.satisfies(r(/a[\w-]/u))

			o(sequence(/a/u, /[-\w]/))
			.satisfies(r(/a[-\w]/u))

			o(sequence(/a/u, /[-\w-]/))
			.satisfies(r(/a[-\w-]/u))

			const R = RegExp
			RegExp = ()=>{}
			try {
				o(()=>sequence(/a/u, /./)).throws(SyntaxError)
				o(()=>sequence(/a/u, [/./])).throws(SyntaxError)
				o(()=>sequence([/a/u], /./)).throws(SyntaxError)
				o(()=>sequence([/a/u], [/./])).throws(SyntaxError)

				o(()=>sequence(/a/u, /[^]/)).throws(SyntaxError)
				o(()=>sequence(/a/u, [/[^]/])).throws(SyntaxError)
				o(()=>sequence([/a/u], /[^]/)).throws(SyntaxError)
				o(()=>sequence([/a/u], [/[^]/])).throws(SyntaxError)

				o(()=>sequence(/a/u, /\p/)).throws(SyntaxError)
				o(()=>sequence(/a/u, [/\p/])).throws(SyntaxError)
				o(()=>sequence([/a/u], /\p/)).throws(SyntaxError)
				o(()=>sequence([/a/u], [/\p/])).throws(SyntaxError)

				o(()=>sequence(/a/u, /\k/)).throws(SyntaxError)
				o(()=>sequence(/a/u, [/\k/])).throws(SyntaxError)
				o(()=>sequence([/a/u], /\k/)).throws(SyntaxError)
				o(()=>sequence([/a/u], [/\k/])).throws(SyntaxError)

				o(()=>sequence(/a/u, /\k<:>/)).throws(SyntaxError)

				o(()=>sequence(/a/u, /\-/)).throws(SyntaxError)
				o(()=>sequence(/a/u, [/\-/])).throws(SyntaxError)
				o(()=>sequence([/a/u], /\-/)).throws(SyntaxError)
				o(()=>sequence([/a/u], [/\-/])).throws(SyntaxError)

				o(() => sequence(/a/u, /\x1/)).throws(SyntaxError)
				o(() => sequence(/a/u, /[\x1]/)).throws(SyntaxError)
				o(() => sequence(/a/u, /\u1/)).throws(SyntaxError)
				o(() => sequence(/a/u, /[\u1]/)).throws(SyntaxError)
				o(() => sequence(/a/u, /\u12/)).throws(SyntaxError)
				o(() => sequence(/a/u, /[\u12]/)).throws(SyntaxError)
				o(() => sequence(/a/u, /\u123/)).throws(SyntaxError)
				o(() => sequence(/a/u, /[\u123]/)).throws(SyntaxError)

				o(()=>sequence(/a/u, /[\w-x]/)).throws(SyntaxError)
				o(()=>sequence(/a/u, /[x-\w]/)).throws(SyntaxError)

				o(() => sequence(/a/u, /((?=())+)/)).throws(SyntaxError)
			} finally {
				RegExp = R
			}


		})
		o("lone brackets are automatically escaped", function() {
			o(sequence(/]/, /a/u)).satisfies(r(/\]a/u))

			o(sequence(/}/, /a/u)).satisfies(r(/\}a/u))

			o(sequence(/a{1}/, /a/u)).satisfies(r(/a{1}a/u))

			o(sequence(/a{1,}/, /a/u)).satisfies(r(/a{1,}a/u))

			o(sequence(/a{1,1}/, /a/u)).satisfies(r(/a{1,1}a/u))

			o(sequence(/a{12}/, /a/u)).satisfies(r(/a{12}a/u))

			o(sequence(/a{12,}/, /a/u)).satisfies(r(/a{12,}a/u))

			o(sequence(/a{12,12}/, /a/u)).satisfies(r(/a{12,12}a/u))

			o(sequence(/\{1}/, /a/u)).satisfies(r(/\{1\}a/u))

			o(sequence(/\{1,}/, /a/u)).satisfies(r(/\{1,\}a/u))

			o(sequence(/\{1,1}/, /a/u)).satisfies(r(/\{1,1\}a/u))

			o(sequence(/\{12}/, /a/u)).satisfies(r(/\{12\}a/u))

			o(sequence(/\{12,}/, /a/u)).satisfies(r(/\{12,\}a/u))

			o(sequence(/\{12,12}/, /a/u)).satisfies(r(/\{12,12\}a/u))

			o(sequence(/[[]/, /a/u)).satisfies(r(/[[]a/u))

		})

		o("No unnecessary escapes", function () {
			o(sequence(/[-}[]/, /a/u)).satisfies(r(/[-}[]a/u))

		})
	})
	o.spec("flag operations", function() {
		o("signature", function() {
			o(flags.add("i", "aha")).satisfies(r(/aha/i))

			o(flags.add("i")("aha", /ho/)).satisfies(r(/ahaho/i))

			// type checks and arity
			o(()=>flags.add(2, "sd")).throws(Error)
			o(()=>flags.add("a", "b", "c")).throws(Error)
			o(()=>flags.add(2)).throws(Error)
			o(()=>flags.add("a")("b", "c")).throws(Error)
			o(()=>flags.add("uii", /f/m)).throws(Error)
			o(()=>flags.add("iui", /f/m)).throws(Error)
		})
		o("flags.add", function() {
			o(flags.add("i", /f/g)).satisfies(r(/f/i))

			o(flags.add("m", /f/i)).satisfies(r(/f/im))

			o(flags.add("m", /f/m)).satisfies(r(/f/m))

			o(flags.add("u", /f/u)).satisfies(r(/f/u))

			o(flags.add("ui", /f/g)).satisfies(r(/f/iu))

			o(flags.add("m", /f/ui)).satisfies(r(/f/imu))

		})
	})
})

o.spec('suffix', function(){
	o('works', function(){
		function n(op) {
			return typeof op === 'string' ? op : '{' + String(op) + '}'
		}
		void [
		'*', '+', '?', '{2}', '{2,}', '{2,4}',
		'*?', '+?', '??', '{2}?', '{2,}?', '{2,4}?',
		0, 1, 2, [0], [1], [2], [0, 1], [1, 1], [3,,],
		].forEach(function(op){
			o(suffix(op, 'a'))
			.satisfies(r(new RegExp('a' + n(op))))

			o(suffix(op, /foo/))
			.satisfies(r(new RegExp('(?:foo)' + n(op))))

			o(suffix(op, /a|b/))
			.satisfies(r(new RegExp('(?:a|b)' + n(op))))

			o(suffix(op, /(a)b/))
			.satisfies(r(new RegExp('(?:(a)b)' + n(op))))

			o(suffix(op, /(ab)/))
			.satisfies(r(new RegExp('(ab)' + n(op))))

			o(suffix(op, /(?:ab)/))
			.satisfies(r(new RegExp('(?:ab)' + n(op))))

			o(suffix(op, /(?<AB>ab)/))
			.satisfies(r(new RegExp('(?<AB>ab)' + n(op))))

		})
	})
	o('invalid quantifiers throw', function() {
		void ['a', '5.', '{5.4}', 'a', '{1,0}'].forEach(function(op) {
			const R = RegExp
			RegExp = ()=>{}
			try {
				o(function() { suffix(op, 'a') }).throws(SyntaxError)
				o(function() { suffix(op) }).throws(SyntaxError)
			} finally {
				RegExp = R
			}
		})
	})
	o('assertions are handled properly', function() {
		const R = RegExp
		RegExp = ()=>{}
		try {
			void [
				'*',
				'+', '?', '{2}', '{2,}', '{2,4}',
				'*?', '+?', '??', '{2}?', '{2,}?', '{2,4}?',
			].forEach(function(op){
				o(()=>suffix(op)()).throws(SyntaxError)

				o(()=>suffix(op, /\b/)).throws(SyntaxError)
				o(()=>suffix(op, /\B/)).throws(SyntaxError)

				// we're stricter than the spec here
				o(()=>suffix(op, /(?=)/)).throws(SyntaxError)
				o(()=>suffix(op, /(?!)/)).throws(SyntaxError)

				o(()=>suffix(op, /(?<=)/)).throws(SyntaxError)
				o(()=>suffix(op, /(?<!)/)).throws(SyntaxError)


				o(()=>suffix(op, /\b/u)).throws(SyntaxError)
				o(()=>suffix(op, /\B/u)).throws(SyntaxError)

				o(()=>suffix(op, /(?=)/u)).throws(SyntaxError)
				o(()=>suffix(op, /(?!)/u)).throws(SyntaxError)

				o(()=>suffix(op, /(?<=)/u)).throws(SyntaxError)
				o(()=>suffix(op, /(?<!)/u)).throws(SyntaxError)
			})
		} finally {
			RegExp = R
		}
	})
})

// Tests for an inner helper
o.spec('parsers', function(){
	o('hasTopLevelChoice', function(){
		o(isDisjunction({source: 'ab', value: {}})).equals(false)
		o(isDisjunction({source: '[a]b', value: {}})).equals(false)
		o(isDisjunction({source: '[a|]b', value: {}})).equals(false)
		o(isDisjunction({source: '[|a]b', value: {}})).equals(false)
		o(isDisjunction({source: '[a|b]', value: {}})).equals(false)
		o(isDisjunction({source: '(a|b)', value: {}})).equals(false)
		o(isDisjunction({source: 'a|b', value: {}})).equals(true)
		o(isDisjunction({source: '(a)|(b)', value: {}})).equals(true)
		o(isDisjunction({source: '[a]|b', value: {}})).equals(true)
		o(isDisjunction({source: /[a\]|]b/.source, value: {}})).equals(false)

	})
})

o.spec("refs", function () {
	o('ref', function(){
		o(sequence(ref(1)))
		.satisfies(r(/\1/))

		o(sequence(ref(9)))
		.satisfies(r(/\9/))

	})

	o("ref() are preserved", function() {
		o(sequence(/()\1/))
		.satisfies(r(/()\1/))

		o(sequence(/()/, ref(1)))
		.satisfies(r(/()\1/))

		o(either(/()/, ref(1)))
		.satisfies(r(/()|\1/))

	})

	o("naked refs are adjusted", function() {
		o(sequence(/()/, /()\1/))
		.satisfies(r(/()()\2/))

		o(either(/()/, /()\1/))
		.satisfies(r(/()|()\2/))

		o(sequence(/()/, /\0/))
		.satisfies(r(/()\0/))

	})

	o("refs in final position are handled properly", function() {
		o(sequence(/(a)\1/, "2"))
		.satisfies(r(/(a)\1(?:)2/))

		o(sequence(/(a)\1/, "a"))
		.satisfies(r(/(a)\1a/))

		o(sequence(sequence(capture("a"), ref(1)), "2"))
		.satisfies(r(/(a)\1(?:)2/))

		o(sequence(sequence(capture("a"), ref(1)), "a"))
		.satisfies(r(/(a)\1a/))

	})

	o("refs in groups", function() {
		o(sequence(
			[/()()/, ref(2)],
			[/()()/, ref(2)]
		))
		.satisfies(r(/()()\2()()\4/))


		o(either(
			[/()()/, ref(2)],
			[/()()/, ref(2)]
		))
		.satisfies(r(/()()\2|()()\4/))


		o(suffix("*",
			[/()()/, ref(2)],
			[/()()/, ref(1)]
		))
		.satisfies(r(/(?:()()\2()()\3)*/))

		o(sequence(
			[
				[/()()/, ref(2)],
				[/()()/, ref(2)]
			],
			[/()()/, ref(2)],
			[/()()/, ref(2)]
		))
		.satisfies(r(/()()\2()()\4()()\6()()\8/))

		o(sequence(
			[
				[/()()/, ref(2)],
				[/()()/, ref(2)]
			],
			[
				[/()()/, ref(2)],
				[/()()/, ref(2)]
			]
		))
		.satisfies(r(/()()\2()()\4()()\6()()\8/))

		o(sequence(
			[/()()/, ref(2)],
			[/()()/, ref(2)],
			[
				[/()()/, ref(2)],
				[/()()/, ref(2)]
			]
		))
		.satisfies(r(/()()\2()()\4()()\6()()\8/))

		o(sequence(
			[
				[/(?<a>)()/, ref(2)],
				[/()()/, ref(2)]
			],
			[/()(?<b>)/, ref(2)],
			[/()()/, ref(2)]
		))
		.satisfies(r(/(?<a>)()\2()()\4()(?<b>)\6()()\8/))

		o(sequence(
			[
				[/(?:o)()/, ref(1)],
				[/()(?=e)/, ref(1)]
			],
			[/(?!a)()/],
			[/()()/, ref(2)]
		))
		.satisfies(r(/(?:o)()\1()(?=e)\2(?!a)()()()\5/))

	})
	o("nested refs with a depth", function() {
		// absurd, would throw with /u/
		o(capture(ref(1)))
		.satisfies(r(/(\1)/))

		o(sequence(/./u, capture(/./u), capture(ref(1,1))))
		.satisfies(r(/.(.)(\1)/u))

		o(sequence(/./u, capture(/./u), capture(capture(ref(1,2)))))
		.satisfies(r(/.(.)((\1))/u))

	})
	o("named captures and refs", function () {
		o(sequence(namedCapture("b")))
		.satisfies(r(/(?<b>)/))

		o(namedCapture("b")())
		.satisfies(r(/(?<b>)/))

		o(()=>ref(":")).throws(SyntaxError)

		o(flags.add("u", namedCapture("b", /a/), ref("b")))
		.satisfies(r(/(?<b>a)\k<b>/u))

		o(flags.add("u", namedCapture("boo", /a/), ref("boo")))
		.satisfies(r(/(?<boo>a)\k<boo>/u))

		o(flags.add("u", namedCapture("_$", /a/), ref("_$")))
		.satisfies(r(/(?<_$>a)\k<_$>/u))

		o(flags.add("u", namedCapture("$_$", /a/), ref("$_$")))
		.satisfies(r(/(?<$_$>a)\k<$_$>/u))

		o(()=>flags.add("u", namedCapture("1b", /a/))).throws(SyntaxError)
		o(()=>flags.add("u", ref("b"))).throws(SyntaxError)
	})
})

o.spec("backwards and atoms", function() {
	const backwards = (f) => {
		let bw
		lookBehind(() => {return bw = f()})
		return bw
	}
  let fw, bw, fwr, bwr, neutral
	o.beforeEach(function() {
		fw = atomic()
		bw = backwards(()=>atomic())

		fwr = ref(1)
		bwr = backwards(() => ref(1))

		neutral = sequence('a', 'b')

	})

	o("works", function() {
		o(fw).satisfies(r(/(?=())\1/))

		o(bw).satisfies(r(/\1(?<=())/))

		o(fwr).satisfies(r(/(?:$ ^d:0,n:1)/))

		o(bwr).satisfies(r(/(?:$ ^d:0,n:1)/))

	})

	o("composition in the right context works", function() {
		o(sequence(fw, 'a')).satisfies(r(/(?=())\1a/))

		o(sequence(fwr, 'a')).satisfies(r(/\1a/))

		o(backwards(()=>sequence(bw, 'a'))).satisfies(r(/\1(?<=())a/))

		o(backwards(()=>sequence(bwr, 'a'))).satisfies(r(/\1a/))

		o(sequence(neutral, "o")).satisfies(r(/abo/))

		o(backwards(()=>sequence(neutral, 'a'))).satisfies(r(/aba/))

	})

	o("composition in the wrong context throws", function() {
		o(()=>sequence(bw)).throws(TypeError)
		o(()=>sequence(bwr)).throws(TypeError)

		o(()=>backwards(()=>sequence(fw))).throws(TypeError)
		o(()=>backwards(()=>sequence(fwr))).throws(TypeError)

	})

	o("composition is contagious", function() {
		const fw2 = sequence(fw, 'a')
		const bw2 = backwards(()=>sequence(bw,'a'))
		const fwr2 = sequence(fwr, 'a')
		const bwr2 = backwards(()=>sequence(bwr,'a'))

		o(()=>sequence(bw2)).throws(TypeError)
		o(()=>sequence(bwr2)).throws(TypeError)
		o(()=>backwards(()=>sequence(fw2))).throws(TypeError)
		o(()=>backwards(()=>sequence(fwr2))).throws(TypeError)

	})

	o("look behind assertions", function() {
		o(lookBehind(()=>['a', 'b']))
		.satisfies(r(/(?<=ab)/))

		o(lookBehind(()=>['a', notBehind('b')]))
		.satisfies(r(/(?<=a(?<!b))/))

		o(lookBehind(()=>['a', notBehind(':', atomic(/\w*/))]))
		.satisfies(r(/(?<=a(?<!:\1(?<=(\w*))))/))

		o(sequence(lookBehind('a'), /a/))
		.satisfies(r(/(?<=a)a/))

		o(sequence(notBehind(()=>atomic('a')), /a/))
		.satisfies(r(/(?<!\1(?<=(a)))a/))

		o(lookBehind(()=>ref(1), sequence("a",capture(/./),"b")))
		.satisfies(r(/(?<=\1a(.)b)/))

	})
})

o.spec("README Examples", function() {
	o("CharSet operations", function() {
		const abcd = charSet.union(/[ab]/, /c/, 'd')

		o(abcd.test('a')).equals(true)
		o(abcd.test('b')).equals(true)
		o(abcd.test('c')).equals(true)
		o(abcd.test('d')).equals(true)


		const ab = charSet.difference(/[abcd]/, /[cd]/)

		o(ab.test('a')).equals(true)
		o(ab.test('b')).equals(true)
		o(ab.test('c')).equals(false)
		o(ab.test('d')).equals(false)

		const bc = charSet.intersection(/[a-c]/, /[b-d]/)

		o(bc.test('a')).equals(false)
		o(bc.test('b')).equals(true)
		o(bc.test('c')).equals(true)
		o(bc.test('d')).equals(false)

		const LcCyrl = charSet.intersection(/\p{Lowercase}/u, /\p{Script=Cyrillic}/u)
		o(LcCyrl.test("б")).equals(true)
		o(LcCyrl.test("Б")).equals(false)

	})
})

o.spec("bound", function() {
	o("works", function() {
		o(bound(/a/))
		.satisfies(r(/(?<!a)(?=a)|(?<=a)(?!a)/))

	})
})

o.spec("integration", function() {
	o("string", function() {
		const tag = namedCapture
		const str = atomic(sequence(
			capture(either("'", '"')),
			suffix("*?", either(
				["\\", /[^]/],
				/./
			)),
			ref(1)
		))

		let result

		o(str).satisfies(r(/(?=(('|")(?:\\[^]|.)*?\2))\1/))

		o(str.test('""')).equals(true)

		result = capture(str).exec('""')
		o(Array.isArray(result)).equals(true)
		o(result).deepEquals(Object.assign([ '""', '""', '""', '"'], {index: 0, input:'""', groups: undefined}))

		result = tag("string", str).exec('""')
		o(result)
		.deepEquals(Object.assign(
			[ '""', '""', '""', '"'],
			{
				index: 0,
				input:'""',
				groups: nullProto({string: '""'})
			}
		))

		const ws = atomic(suffix("+", either(
			/\s/,
			["/*", suffix("*?", /[^]/), '*/'],
			["//", /.*?\n/]
		)))


		const e = flags.add("g",
			either(
				tag("whiteSpace", ws),
				tag("url", atomic(["url(", suffix("?", ws), str, suffix("?", ws), ")"])),
				tag("string", str),
				tag("error", /[^]/)
			)
		)

		e.lastIndex = 0
		o(e.test('"sdfdjs"')).equals(true)

		e.lastIndex = 0
		o(e.test("'sdfdsf'")).equals(true)

		e.lastIndex = 0
		o(e.test('""')).equals(true)

		e.lastIndex = 0
		o(e.test("''")).equals(true)

		let source = `"ababa" //foo

		/* jojo
		*/
		url( "dada" )
		url("dada")
		"
		`
		e.lastIndex = 0

		while((result = e.exec(source)) && !(result.groups.error )){
			// console.log({result})
		}
		o(result.groups.error).equals('"')
		o(result.index).equals(62)

		source = `"ababa" //foo

		/* jojo
		*/
		url( "dada" )
		url("dada")
		//"
		`
		e.lastIndex = 0

		while((result = e.exec(source)) && !(result.groups.error)){}
		o(result).equals(null)
	})
})

