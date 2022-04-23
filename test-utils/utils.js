import o from 'ospec'

export function calledFrom(n=0) {
	try {throw new Error()} catch(e) {return e.stack.split("\n")[2+n].replace(/^\s*/, "")}
}

// the ospec spy doesn't cut it here, we want the call sites
function spy(f) {
	function spied() {
		spied.callSites.add(calledFrom(1))
		return f.apply(this, arguments)
	}
	return Object.assign(spied, {callSites: new Set})
}

function strip(s) {
	// normalize the format
	return (s.indexOf("(") === -1) ? s.slice(3) : s.replace(/^[^\(]+\(|\)$/g, '')
}

function sort(ary) {
	return ary.map(strip).sort(function(a, b) {
		const [nameA, lineA, colA] = a.split(':')
		const [nameB, lineB, colB] = b.split(':')
		// const [name, line, col] = partsA
		return nameA.localeCompare(nameB)
		|| Number(lineA) - Number(lineB)
		|| Number(colA) - Number(colB)
	})
}

Object.entries(console).forEach(([k, v]) => {
	console[k] = spy(v)
})

o.after(function(){
	Object.entries(console).forEach(([k, v]) => {
		o(v.callSites).satisfies(
			set => (
				set.size === 0
				? {pass: true}
				: {pass: false, message:
`console.${k}() was called from ${set.size} site${set.size === 1 ? '' : 's'}
${sort([...v.callSites]).map(s => "... " + s).join('\n')}
`
				}
			)
		)
	})
})


export function nullProto(v) {
	v.__proto__ = null
	return v
	// The proper way would be as follows, but since the simple way works...
	// return Object.create(null, Object.entries(v).reduce(
	//   (acc, [k, value]) => Object.assign(acc, {[k]: {
	//     value,
	//     configurable: true,
	//     enumerable: true,
	//     writable: true
	//   }}),
	//   {}
	// ))
}

// custom assertion for RegExp
// Checks the source and flags for mismatches.
export function r(ref){
	if (!(ref instanceof RegExp)) throw new TypeError("RegExp expected as reference")

	return function(candidate) {
		if (!(candidate instanceof RegExp)) return {pass: false, message: "RegExp expected, got " + candidate}
			let errors = 0
		if (candidate.source !== ref.source) errors++
		if (candidate.flags !== ref.flags) errors++

		return errors === 0
		? {pass: true, message: "" + candidate + " shouldn't have matched its reference"}
		: {pass: false, message: (
			"RegExp mismatch:\n\t/"
			+ candidate.source + "/" + candidate.flags
			+ "\nshould be\n\t/"
			+ ref.source + "/" + ref.flags
		)}
	}
}

export function m(spec) {
	if (!Object.hasOwn(spec, 'ok') && !Object.hasOwn(spec, 'ko')) throw new TypeError("No `ok` nor `ko` in `m()` test")
	if (Object.hasOwn(spec, 'ok') && !Array.isArray(spec.ok)) throw new TypeError("Array expected for spec.ok")
	if (Object.hasOwn(spec, 'ko') && !Array.isArray(spec.ko)) throw new TypeError("Array expected for spec.ko")
	return function (rx) {
		const errors = []
		const successes = []
		void (spec.ok || []).forEach(ok => {
			if (!rx.test(ok)) errors.push(`${rx} should have matched ${JSON.stringify(ok)}`)
			else successes.push(`${rx} shouldn't have matched ${JSON.stringify(ok)}`)
		})
		void (spec.ko || []).forEach(ko => {
			if (rx.test(ko)) errors.push(`${rx} shouldn't have matched ${JSON.stringify(ko)}`)
			else successes.push(`${rx} should have matched ${JSON.stringify(ko)}`)
		})
		return {pass: errors.length === 0, message: (errors.length === 0 ? successes : errors).join('\n')}
	}
}

let c = 0
const alreadyPrinted = Object.create(null)
global.TODO = (...items) => {
	const cf = calledFrom(1)
	const text = items.map(x=> "- "+x).join("\n")
	const callSite = calledFrom(1)
	const key = JSON.stringify([text, callSite])
	if(alreadyPrinted[key]) return
	alreadyPrinted[key] = true
	try{
		o().satisfies(()=>({pass: false, message: "TODO " + ++c + ":\n\n" + text + "\n\n" + cf}))
	}catch(e){
		o("TODO "+ ++c, ()=>{
			o().satisfies(()=>({
				pass: false, 
				message: "\n" + text + "\n\n" + cf}))
		})
	}
} 

global.p = (a, ...x) => (console.log(calledFrom(1),"\n",a, ...x), a)