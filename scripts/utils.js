import chp from 'child_process'
import { stringify } from 'querystring'

function childPromise(child) {
	const err = []
	const out = []
	if (child.stdout) {
		child.stdout.on('data', d=> out.push(d.toString()))
		child.stderr.on('data', d=> err.push(d.toString()))	
	}
	return Object.assign(new Promise(function (fulfill, _reject) {

		const reject = e => _reject(Object.assign(new Error("Problem in child process"), e))

		const handler = (code, signal) => (code === 0 ? fulfill : reject)({
			code,
			stderr: err.join(''),
			stdout: out.join(''),
			signal
		})

		child.on("close", handler)
		child.on("exit", handler)
		child.on("error", err => {
			reject({error: err.stack})
			if (child.exitCode == null) child.kill('SIGTERM')
			setTimeout(()=>{
				if (child.exitCode == null) child.kill('SIGKILL')
			}, 200)
		})
	}), {process: child})
}



// This returns a Promise augmented with a `process` field for raw
// access to the child
// The promise resolves to an object with this structure
// {
// 	code? // exit code
// 	signal? // signal recieved
// 	stdout: string,
// 	stderr: string,
// 	error?:  // the stack of the error on rejection
// }
// On rejection, the Error is augmented with the same fields

export const command = (cmd, options = {}) => (...params) => {
	console.log('$ ' + [cmd, ...params].join(' '))
	return childPromise(chp.spawn(cmd, params, {
		stdio: 'inherit',
		env: process.env,
		cwd: process.cwd(),
		...options
	}))
}


export const readFromCmd = (cmd, options) => (...params) => childPromise(chp.spawn(cmd, params, {
	env: process.env,
	cwd: process.cwd(),
	...options
}))

