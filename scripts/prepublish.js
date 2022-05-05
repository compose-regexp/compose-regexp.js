import { command, readFromCmd } from './utils.js'
import pkg from '../package.json' assert { type: 'json' }

const git = command('git')
const readGit = readFromCmd('git')
const readNpm = readFromCmd('npm')

const {version} = pkg

const messages = []


if (!process.env.NPM_PUBLISH) messages.push("/!\\ Please use `npm run release`")


try { await readNpm('run', 'test')} catch({stderr, stdout}) {
    messages.push("/!\\ There was a problem with the test suite", stdout, stderr)
}


// `git status --porecelain` is empty when the tree is clean
const {stdout: gitOutput} = await readGit('status', '--porcelain')
if (gitOutput.trim() !== '') messages.push("/!\\ The git working tree is not clean")    


const {stdout: branch} = await readGit('branch', '--show-current')
if (branch !== "main\n") messages.push(`/!\\ We are on branch ${branch.trim()}, we release from main`)    


const {stdout: remoteVersion} = await readNpm("view", "compose-regexp", "version")
if(remoteVersion.trim() === version) messages.push("/!\\ You didn't bump the version number")

try {await readNpm('run', 'build')} catch({stderr}) {
    messages.push("/!\\ There was a problem building the lib", stderr)
}

if (messages.length !== 0) {
    console.error('\n' + messages.join('\n\n') + '\n')
    process.exit(1)
}

const {stdout: changes} = await readGit('status', '--porcelain')
if (changes !== '') {
    await git('commit', '-am', `"build artefacts"`)
}
