import o from 'ospec'

// This must happen before importing the lib
import {nullProto, r} from '../test-utils/utils.js'

import {
	atomic, notAhead, bound, capture, charSet, either,
	flags, lookAhead, lookBehind, namedCapture, noBound,
	notBehind, ref, sequence, suffix
} from '../compose-regexp.js'

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

void [].forEach(()=>[atomic, notAhead, bound, capture, charSet, either, flags, lookAhead, lookBehind, namedCapture, noBound, notBehind, ref, sequence, suffix])