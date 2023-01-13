import { command, readFromCmd } from './utils.js'
import pkg from '../package.json' assert { type: 'json' }

const git = command('git')
const npm = command('npm')
const readGit = readFromCmd('git')
const readNpm = readFromCmd('npm')

const {version} = pkg

const errors = []

console.log("Checking if we're alright...")

await Promise.all([
	(async () => {
		await Promise.all([
			(async () => {
				try {
					const {stdout: branch} = await readGit('branch', '--show-current')
					if (branch !== "main\n") {
						errors.push(`/!\\ We are on branch ${branch.trim()}, we publish from main`)

					}
					// `git status --porecelain` is empty when the tree is clean
					const {stdout: status} = await readGit('status', '--porcelain')
					if (status.trim() !== '') errors.push("/!\\ The git working tree is not clean")

					const _ignore = await readGit('push', '--dry-run', '--porcelain')
				} catch({stderr, stdout}) {
					errors.push("/!\\ git status, git branch or git push --dry-run error:", stdout, stderr)
				}
			})(),
			(async () => {
				try {
					await readNpm('run', 'test')

				} catch({stderr, stdout}) {
					errors.push("/!\\ There was a problem with the test suite", stdout, stderr)
				}
			})(),
		])
		try{
			// won't run if the git status or branch are wrong
			// it must run after the tests too, because the latter
			// build the regexps
			if (errors.length === 0) await npm('run', 'build')

		} catch({stderr, stdout}) {
			errors.push("/!\\ npm run build error:", stdout, stderr)
		}
	})(),
	(async () => {
		try {
			const {stdout} = await readNpm("view", "compose-regexp", "version")
			if(stdout.trim() === version) errors.push("/!\\ You didn't bump the version number")

		} catch({stderr, stdout}) {
			errors.push("/!\\ npm view composer-regexp version", stdout, stderr, ">>>>")
		}
	})(),
])


if (errors.length !== 0) {
	console.error('\n' + errors.filter(x=>x!=='').join('\n\n') + '\n')
	process.exit(1)
}


console.log("All good!")


const {stdout: changes} = await readGit('status', '--porcelain')
if (changes !== '') {
	await git('commit', '-am', `build artefacts`)
}
