import o from 'ospec'

function calledFrom(n=0) {
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
            + ref.source + "/" + ref.flags
            + "\nshould be\n\t/"
            + candidate.source + "/" + candidate.flags
        )}
	}
}
