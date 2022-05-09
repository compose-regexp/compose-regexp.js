
import {writeFileSync} from 'fs'
import { command } from './utils.js'
import pkg from '../package.json' assert { type: 'json' }

const git = command('git')
const npm = command('npm')
const sleep = t => new Promise(f => setTimeout(f, t * 1000))

const {version} = pkg
const tag = 'v' + version

await git('tag', tag)

await git('push', '--tags')

pkg.devDependencies['stable-version'] = `npm:compose-regexp@${version}`

writeFileSync('./package.json', JSON.stringify(pkg, null, '\t'), 'utf-8')
let success = false
do {
	await npm('cache', 'clean', '--force')

	// give the npm servers some time
	await sleep(1)
	
	try { 
		await npm('i')
		success = true
	} catch(e) {
		console.log("retrying to fetch the latest version")
	}
} while (!success)

await npm('run', 'test')

await git('commit', '-am', `"bump self-dep to ${tag}"`)

await git('push', 'origin', 'main')
