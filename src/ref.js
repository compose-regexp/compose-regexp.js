function _ref(n) {
	return '\\' + String(n)
}
export function Ref(n) {
	return Object.assign(_ref.bind(null, n), {ref: true})
}
export function isRef(r) {
	return typeof r === 'function' && r.ref
}
