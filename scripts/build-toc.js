import fs from "fs"

import {either, flags, lookAhead, lookBehind, namedCapture as tag, sequence, suffix} from 'stable-version'

// My doc-toc replacement:

const titlesMatcher = flags.add('g', either(
    sequence(
        /^/m,
        tag('level', suffix('+', '#')),
        /\s*/,
        tag('content', /.+/),
        /$/m
    ),
    tag('fence', sequence(/^\s*/m, '```'))
))

const tocMatcher = sequence(lookBehind('<!-- START toc -->\n'), /[^]*?/, lookAhead('<!-- END toc -->'))

const README = fs.readFileSync('./README.md', {encoding: 'utf-8'}).toString()

// /[^-\p{ID_Continue}]/gu is meant to strip Emoji, it may be too broad, or too narrow a filter.
// We're dealing with ASCII in compose-regexp so this is overkill for us... What we have seems
// to be compatible with what GitHub generates...
// TODO: read https://tools.ietf.org/html/rfc3986 :-)

const slugify = text => `[${text}](#${text.replace(/ /g, '-').replace(/[^-\p{ID_Continue}]/gu, '').toLowerCase()})`

let inFence = false
let previousDepth = 0
const TOC = [...README.matchAll(titlesMatcher)]
// ignore the content of code fences
.filter(({groups: {fence}}) => {
    const wasInFence = inFence
    if (fence != null) inFence = !inFence
    return !(fence || wasInFence)
})
// remove the sections in the intro, which skip a
// title level ==> (previousDepth - depth <= -2)
.filter(({groups: {level}}) => {
    const depth = level.length
    if (previousDepth - depth < -1) return false
    previousDepth = depth
    return true
})
// Remove the TOC itself
.filter(({groups:{content}}) => {
    return content !== 'TOC'
})
// slugify
.map(({groups: {level, content}})=>{
    const indent = (level.length -1) * 4
    return `${' '.repeat(indent)}- ${slugify(content)}`
})
.join('\n')

fs.writeFileSync('./README.md', README.replace(tocMatcher, TOC), {encoding: 'utf-8'})