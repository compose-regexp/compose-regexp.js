import fs from 'fs'
import { command } from './utils.js'
import pkg from '../package.json' assert { type: 'json' }

const git = command('git')
const npm = command('npm')

const {version} = pkg
const tag = 'v' + version

await git('tag', tag)

await git('push', '--tags')

pkg.devDependencies['compose-regexp'] = version

fs.writeFileSync('./package.json', JSON.stringify(pkg, null, '\t'), 'utf-8')

await npm('i')

await npm('run', 'test')

await git('commit', '-am', `"bump self-dep to ${tag}"`)

await git('push', 'origin', 'main')
