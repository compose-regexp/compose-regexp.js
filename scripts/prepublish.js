import fs from 'fs'

const messages = []

const cleanGit = fs.readSync(process.stdin.fd, new Buffer.alloc(1)) === 0

if (!cleanGit) messages.push("/!\\ The git working tree is not clean")
if (!process.env.NPM_PUBLISH) messages.push("/!\\ Please use `npm run publish`")

if (messages.length !== 0) {

    console.error(messages.join('\n\n')+'\n')
    process.exit(1)
}