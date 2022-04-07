function _ref(n) {
	return '\\' + (typeof n === 'number' ? String(n) : 'k<' + n + '>')
}
export function Ref(n) {
	return Object.assign(_ref.bind(null, n), {ref: true})
}
export function isRef(r) {
	return typeof r === 'function' && r.ref
}
