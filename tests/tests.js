import o from 'ospec'

// This must happen before importing the lib
import {nullProto, r} from '../test-utils/utils.js'

import {
	atomic, avoid, capture, either, flags,
	lookAhead, lookBehind, namedCapture,
	notBehind, ref, sequence, suffix
} from '../compose-regexp.js'

import {hasTopLevelChoice} from '../src/core.js'

o.spec("general", function () {
	o('string and a lack of arguments are normalized', function(){
		[
		either, sequence,
		suffix('*'),
		lookAhead, avoid,
		flags(''), capture
		].forEach(function(f) {
			// normalization
			o(f(/\./))
			.satisfies(r(f('.')))

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

})

o('sequence', function() {
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

})

o('avoid', function(){
	o(avoid('a'))
	.satisfies(r(/(?!a)/))

	o(avoid('a', 'b'))
	.satisfies(r(/(?!ab)/))

	o(avoid('a', 'b', 'c'))
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
			o(flags(k, /o/)[flagKinds[k]]).equals(true)
			o(flags(k)(/o/)[flagKinds[k]]).equals(true)
			for (var kk in flagKinds) if (k !== kk) {
				o(flags(kk, /o/)[flagKinds[k]]).equals(false)
				o(flags(kk)(/o/)[flagKinds[k]]).equals(false)
			}
		}
		o(flags('m', /o/).multiline).equals(true)
		o(flags('i', /o/).multiline).equals(false)

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

		o(()=>flags(illegal)).throws(SyntaxError)
		o(()=>flags.add(illegal)).throws(SyntaxError)
		o(()=>flags.remove(illegal)).notThrows(SyntaxError)

	})

	o("mixed flags ", function () {
		o(()=>sequence(/./, /./i)).throws(Error)

	})

	o.spec("u flag", function() {

			o("flag('u',...) rejects invalid non-u sources", function() {
				// Make sure we are the ones throwing
				const R = RegExp
				RegExp = function(...a){}
				
				o(()=>flags('u', /\a/)).throws(SyntaxError)
				o(()=>flags('u', /\-/)).throws(SyntaxError)
				o(()=>flags('u', /\u1/)).throws(SyntaxError)
				o(()=>flags('u', /\x1/)).throws(SyntaxError)
				o(()=>flags('u', /\u12/)).throws(SyntaxError)
				o(()=>flags('u', /\u123/)).throws(SyntaxError)
				RegExp = R
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

			o(avoid(/a/u, /b/u))
			.satisfies(r(/(?!ab)/u))

			o(avoid(/a/u, /b/u, /c/u))
			.satisfies(r(/(?!abc)/u))

			o(lookAhead(/a/u, /b/u))
			.satisfies(r(/(?=ab)/u))

			o(lookAhead(/a/u, /b/u, /c/u))
			.satisfies(r(/(?=abc)/u))

		})
		o("u contagiosity", function() {
			o(sequence(/a/u, /b/))
			.satisfies(r(/ab/u))

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

			o(avoid(/a/u, /b/))
			.satisfies(r(/(?!ab)/u))

			o(avoid(/a/, /b/u, /c/u))
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


			o(sequence(/a/u, /\w\s\W\S\d\D/))
			.satisfies(r(/a\w\s\W\S\d\D/u))

			o(sequence(/a/u, /\x12/))
			.satisfies(r(/a\x12/u))

			o(sequence(/a/u, /[\x12]/))
			.satisfies(r(/a[\x12]/u))

			o(sequence(/a/u, /\u1234/))
			.satisfies(r(/a\u1234/u))

			o(sequence(/a/u, /[\u1234]/))
			.satisfies(r(/a[\u1234]/u))

		})

		o(". is upgraded", function() {
			o(sequence(/./u, /b/))
			.satisfies(r(/.b/u))

			const ref = /a(?:(?![\u{10000}-\u{10ffff}]).)/u

			o(sequence(/a/u, /./))
			.satisfies(r(ref))

			o(sequence(/a/u, [/./]))
			.satisfies(r(ref))

			o(sequence([/a/u], /./))
			.satisfies(r(ref))

			o(sequence([/a/u], [/./]))
			.satisfies(r(ref))

		})

		o("bad escapes can't be upgraded", function() {
			o(sequence(/a/u, /\+/))
			.satisfies(r(/a\+/u))

			o(sequence(/a/u, /[\-]/))
			.satisfies(r(/a[\-]/u))

			o(()=>sequence(/a/u, /\p/)).throws(SyntaxError)
			o(()=>sequence(/a/u, [/\p/])).throws(SyntaxError)
			o(()=>sequence([/a/u], /\p/)).throws(SyntaxError)
			o(()=>sequence([/a/u], [/\p/])).throws(SyntaxError)

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


			// TODO: Autmatically fix lone brackets.
			// This requires a two pass approach
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
		o.spec("flag operations", function() {
			o("signature", function() {
				o(flags.add("i", "aha")).satisfies(r(/aha/i))

				o(flags.remove("i", /aha/i)).satisfies(r(/aha/))

				o(flags.add("i")("aha")).satisfies(r(/aha/i))

				o(flags.remove("i")(/aha/i)).satisfies(r(/aha/))

				// type checks and arity
				o(()=>flags.add(2, "sd")).throws(Error)
				o(()=>flags.add("a", "b", "c")).throws(Error)
				o(()=>flags.add(2)).throws(Error)
				o(()=>flags.add("a")("b", "c")).throws(Error)
				o(()=>flags.remove(2, "sd")).throws(Error)
				o(()=>flags.remove("a", "b", "c")).throws(Error)
				o(()=>flags.remove(2)).throws(Error)
				o(()=>flags.remove("a")("b", "c")).throws(Error)
			})
			o("flags.add", function() {
				// o(flags.add("i", /f/m)).satisfies(r(/f/im))

				// o(flags.add("m", /f/i)).satisfies(r(/f/im))

				// o(flags.add("m", /f/m)).satisfies(r(/f/m))

				// o(flags.add("u", /f/u)).satisfies(r(/f/u))

				o(flags.add("ui", /f/m)).satisfies(r(/f/imu))

				o(flags.add("m", /f/ui)).satisfies(r(/f/imu))

			})
			o("flags.remove", function() {
				o(flags.remove("i", /u/i)).satisfies(r(/u/))

				o(flags.remove("i", /u/ium)).satisfies(r(/u/mu))

				o(flags.remove("i", /u/)).satisfies(r(/u/))

				// you can't remove the u
				o(flags.remove("u", /u/ium)).satisfies(r(/u/imu))

				o(flags.remove("u", /u/u)).satisfies(r(/u/u))

				o(flags.remove("ium", /u/u)).satisfies(r(/u/u))

				o(flags.remove("ium", /u/ium)).satisfies(r(/u/u))

			})
		})
	})
})

o.spec('suffix', function(){
	o('works', function(){
		[
		'*', '+', '?', '{2}', '{2,}', '{2,4}',
		'*?', '+?', '??', '{2}?', '{2,}?', '{2,4}?',
		].forEach(function(op){
			o(suffix(op, 'a'))
			.satisfies(r(new RegExp('a' + op)))

			o(suffix(op, /foo/))
			.satisfies(r(new RegExp('(?:foo)' + op)))

			o(suffix(op, /a|b/))
			.satisfies(r(new RegExp('(?:a|b)' + op)))

			o(suffix(op, /(a)b/))
			.satisfies(r(new RegExp('(?:(a)b)' + op)))

		})
	})
	o('invalid ranges throw', function(){
		['a', '5.', '{5.4}'].forEach(function(op){
			o(function() { suffix(op, 'a') }).throws(Error)
			o(function() { suffix(op) }).throws(Error)

		})
	})
})

// Tests for an inner helper
o.spec('parsers', function(){
	o('hasTopLevelChoice', function(){
		o(hasTopLevelChoice('ab')).equals(false)
		o(hasTopLevelChoice('[a]b')).equals(false)
		o(hasTopLevelChoice('[a|]b')).equals(false)
		o(hasTopLevelChoice('[|a]b')).equals(false)
		o(hasTopLevelChoice('[a|b]')).equals(false)
		o(hasTopLevelChoice('(a|b)')).equals(false)
		o(hasTopLevelChoice('a|b')).equals(true)
		o(hasTopLevelChoice('[a]|b')).equals(true)
		o(hasTopLevelChoice(/[a\]|]b/.source)).equals(false)

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
		o(sequence(/()/, /\1/))
		.satisfies(r(/()\2/))

		o(either(/()/, /\1/))
		.satisfies(r(/()|\2/))


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
	o("named captures and refs", function () {
		o(flags("u", namedCapture("b", /a/), ref("b"))).satisfies(r(/(?<b>a)\k<b>/u))

		o(flags("u", namedCapture("boo", /a/), ref("boo"))).satisfies(r(/(?<boo>a)\k<boo>/u))

		o(flags("u", namedCapture("_$", /a/), ref("_$"))).satisfies(r(/(?<_$>a)\k<_$>/u))

		o(flags("u", namedCapture("$_$", /a/), ref("$_$"))).satisfies(r(/(?<$_$>a)\k<$_$>/u))

		o(()=>flags("u", namedCapture("1b", /a/))).throws(SyntaxError)
		o(()=>flags("u", ref("b"))).throws(SyntaxError)
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


		const e = flags("g",
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

