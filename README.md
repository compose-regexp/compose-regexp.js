# ![compose-regexp.js](https://raw.githubusercontent.com/compose-regexp/compose-regexp.js/main/logo.svg)

[![No dependencies](https://img.shields.io/badge/deps-none-brightgreen)](./package.json)
[![Tiny file size](https://img.shields.io/github/size/compose-regexp/compose-regexp.js/dist/compose-regexp.min.js.br)](./dist)
[![codecov](https://codecov.io/gh/compose-regexp/compose-regexp.js/branch/main/graph/badge.svg?token=L2qpyWZcv3)](https://codecov.io/gh/compose-regexp/compose-regexp.js)

- Build and compose *maintainable* regular exprssions in JavaScript.
- ReDOS, begone!

### Highlights

#### Fixing ReDOS

```JS
import {atomic, sequence} from 'compose-regexp'

// classic ReDOS-vulnerable RegExp:
const ReDOS = /^(([a-z])+.)+[A-Z]([a-z])+$/

// fixed with compose-regexp, this does not backtrack
const fixed = sequence(/^/, atomic(/(([a-z])+.)+/), /[A-Z]([a-z])+$/)
```

You can test it on [flems.io](https://flems.io/#0=N4Igxg9gdgzhA2BTEAucD4EMAONEBMQAaEAMwEskZUBtUKTAW2TQDoALAF0fmPSk6IBqECAC+RekxYhWAK2olIAoZxHlG2CACdOAAmCZOERuTBE9eAI4BXIWERi9pbSb0BySJoh4AtNsQAc0QAD2wAAQAGVgA2Vkj3AB0oZIB6VL0AMXIQ8ihAvQAlRAARAHkAZT0Ad3JOdj0vLT8A4LDk5Rh9YvKqgF49VIA9AAoRmkxfAC8AXQBKAGpWRZoAQV8ALRnxydnFgBJU5LSMgDkIQT16oxrtHGw8gvrEGvYEF+LAgFEwmogbeD4KDufTVHQAaws0EQJz07EwMCuEEsjyQen++meemwmF0V3h+gARpgwODOHdSYjMFB8HpyHAsIJYXU6VA9NT2cZTGARnNGph4PBWB1oF1nDkCHoBtY7FAHCNhqkLEYTGYFWMJtN5ktFqk5hZUmtNttNXsFoc5sc5aLMRoXgMRlhCYh4BZSHy+gA+AzJPSNUXvVicO2OzDO+CWtn+2CB+AQQIjUi8yN+zqB4PML400PhyNiK2dTGILo9SpSvQhKXejOIEaJECFL69FB6esLEIWXle0sVIPFzgjEJzSOFq797IhSUDSteq4h+sUSf4Fttjt6LuexcEPtdQfDq3pMDsRCk-EvABCrmqeG00YZiDdSEYiPwEGLwP0+Hp2CwAE87+mdrYq42CINo8C-skABuEDkLSNC+q2ICYChqFoehGGoQAhPWRCIfWmGEURmA4cQ+HIcRlFoaReFRgRVEMSRuHkYxjGkckMysKQOhfCS7AjDAXrAIIJalJUAlzAA3GOXQTgQEliJGyR8HgSBgMGooiJEKAAKwAEziJIIAMMwIisGAMCKPwgjCGg4gzGIQA).

#### Combining character sets

```JS
import {bound, charSet, flags, suffix} from 'compose-regexp'

const LcGrekLetter = charSet.intersection(/\p{Lowercase}/u, /\p{Script=Greek}/u)
LcGrekLetter.test("Γ") // false
LcGrekLetter.test("γ") // true
LcGrekLetter.test("x") // false

// like /\b/, but for Greek rather than /\w/
const b = bound(/\p{Script=Greek}/u)

const LcGrekWords = flags.add('g', b, suffix("+", LcGrekLetter), b)

for (lc of `Θεωρείται ως ο σημαντικότερος θεμελιωτής ...`.matchAll(LcGrekWords)) {
  console.log(lc) //'ως', 'ο', 'σημαντικότερος', 'θεμελιωτής'
}
```

You can test it live on [flems.io](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4IWAA60ATsQAEwDMVpYI1CnIBGtAK5oAJhuqEM0gMoxiGsFAwBzOBrgwAjjqbUYTnWEgAPVjkwaRU5AHI6SVpnAFppGDsYPwkAAQAGfAA2fDSwgB00AqE4eQAZagBxeIBrUstGaTkAXjljUwtifAhhaWdqYgh6AAoAejy8iWBS2gB3GGlqDGdWEZ0NMYngM2ppCAliJqqYGGqVnQBKAvKj2vr5-EYSobyQQGTgF-O5EZGgjChnK6VGp1YgNB7wYjPECAZuAPl8fsRpO5ATcQWDHpCXn44d9fv8YAVCWhivJNM0tLoDKNxpNtrt9od4iczpdCsT6CU5NcagB1GT6ck2exwfAYfT6IZhOxhDTITTeXwQPxQgDULw03JOaPm5w0mgAuqyCmAZHIhrB5FBqHJaGA5AADQAZwIBW4EAk8CAQeBnYB64EAI8CARuBAJ3AcldgCHgOSAfuA5IBh4EA7cCAHuA-YBe4B9AcAXcCAGeAfc73eGw4AO4GdcedgG7gAOun2AOuAw-ga-b8FglMYAIJQKBDTXVPnSfTnT7AApyVoc2iwfBQWh2c3UT7fMKhmXhcMLsKxhPJtOZ7O55cFoul8tV-JoVgFSggZywfqDNAIHhpRAADgAzGwOCBMDg8PhqHABDR6IwzA8Gw+qsEAA).

## TOC

<!-- START toc -->
- [![compose-regexp.js](https://raw.githubusercontent.com/compose-regexp/compose-regexp.js/main/logo.svg)](#compose-regexpjshttpsrawgithubusercontentcomcompose-regexpcompose-regexpjsmainlogosvg)
    - [Why you may need this lib](#why-you-may-need-this-lib)
    - [Usage](#usage)
        - [Installation](#installation)
        - [Example](#example)
    - [API](#api)
        - [In a nutshell](#in-a-nutshell)
        - [General notes](#general-notes)
        - [Basic combinators](#basic-combinators)
            - [either(...exprs) : RegExp](#eitherexprs--regexp)
            - [sequence(...exprs) : RegExp](#sequenceexprs--regexp)
            - [suffix(quantifier, ...exprs) : RegExp](#suffixquantifier-exprs--regexp)
            - [suffix(quantifier)(...exprs) : RegExp](#suffixquantifierexprs--regexp)
            - [maybe(...exprs) : RegExp](#maybeexprs--regexp)
            - [flags(opts, ...exprs) : RegExp](#flagsopts-exprs--regexp)
            - [flags(opts)(...exprs) : RegExp](#flagsoptsexprs--regexp)
        - [Captures and References](#captures-and-references)
            - [capture(...exprs) : RegExp](#captureexprs--regexp)
            - [namedCapture(...exprs) : RegExp](#namedcaptureexprs--regexp)
            - [ref(label: string) : RegExp](#reflabel-string--regexp)
            - [ref(n: number) : RegExp (thunk)](#refn-number--regexp-thunk)
            - [ref(n: number, depth: number) : RegExp (thunk)](#refn-number-depth-number--regexp-thunk)
        - [Assertions](#assertions)
            - [lookAhead(...exprs) : RegExp](#lookaheadexprs--regexp)
            - [notAhead(...exprs) : RegExp](#notaheadexprs--regexp)
            - [lookBehind(...exprs) : RegExp](#lookbehindexprs--regexp)
            - [notBehind(...exprs) : RegExp](#notbehindexprs--regexp)
        - [Derived Utilites](#derived-utilites)
            - [atomic(...exprs) : RegExp](#atomicexprs--regexp)
            - [bound(...exprs) : RegExp](#boundexprs--regexp)
            - [noBound(...exprs) : RegExp](#noboundexprs--regexp)
            - [charSet.difference(a, b) : RegExp](#charsetdifferencea-b--regexp)
            - [charSet.intersection(a, b) : RegExp](#charsetintersectiona-b--regexp)
            - [charSet.complement(cs) : RegExp](#charsetcomplementcs--regexp)
            - [charSet.union(...cs) : RegExp](#charsetunioncs--regexp)
    - [Atomic matching](#atomic-matching)
    - [Let's talk about flags](#lets-talk-about-flags)
    - [Back References](#back-references)
    - [Browser support](#browser-support)
    - [Limitations and missing pieces](#limitations-and-missing-pieces)
    - [License MIT](#license-mit)<!-- END toc -->

## Why you may need this lib

Regular exprssions don't do justice to regular grammars.

Complex RegExps hard to read, debug and modify. For code reuse, we often resort to source string concatenation which is error prone and even less readable than RegExp literals.

Also, the matching engines are, by spec, required to backtrack on match failures. This can enable surprising behavior, and even the ReDOS attack where maliciously crafted input triggers exponential backtracking, a heavy computation that can freeze programs for hours if not for years.

**`compose-regexp` to the rescue!**

`compose-regexp` will let you take advantage of the finely honed RegExp engines shipped in Browsers while making RegExps readable, testable, and ReDOS-proof witout deep knowledge of the engines.

It doesn't make regular grammars more powerful, they are still [fundamentally limited](https://en.wikipedia.org/w/index.php?title=Chomsky_hierarchy&oldid=762040114#The_hierarchy), but since they are ubiquitous, we may as well have better tooling to put them to use...

`compose-regexp` is reasonably small, and doesn't have dependencies. You can use it as a plain dependency, or, for client-side apps, in a server-side script that generates the RegExps that you ship to the browsers.

## Usage

### Installation

```Shell
$ npm install --save compose-regexp
```

## API

### In a nutshell

```JS
// Core combinators
either(...exprs)             // /a|b/
sequence(...exprs)           // /ab/
suffix(quantifier, ...exprs) // /a+/, /(?:a|b){1,3}/
maybe(...exprs)              // shortcut for `suffix('?', ...)`
flags.add(flags, ...exprs)   // add flags


// captures and references
capture(...exprs)              // /(...)/
namedCapture(label, ...exprs)  // /(?<label>...)/
ref(nuberOrLabel)              // /\1/ or /\k<label>/
ref(num, depth)                // /\1/

// predicates
lookAhead(...exprs)    // positive look ahead: /(?=...)/
notAhead(...exprs)     // negative look ahead: /(?!...)/
lookBehind(...exprs)   // positive look behind: /(?<=...)/
notBehind(...exprs)    // negative look behind: /(?<!...)/

// other functions
atomic(...exprs) // helper to prevent backtracking

bound(...exprs) // like /\b/, but for arbitrary character classes rather than just \w
noBound(...exprs) // like /\B/ for arbitrary character classes

// Operating on character classes.
// The result of these function will match ...
charSet.difference(a, b) // ... characters that match charSet `a` and don't match charSet `b`
charSet.intersection(a, b) // ... characters that match both charSet `a` and charSet `b`
charSet.complement(a) // ... characters that don't match `a`
charSet.union(...cs) // ... character that match any of the provided charsets

// The lack of non-capturing group API is deliberate. We insert them
// automatically where needed, they are not a user concern when using
// this lib.
```

Here's a [flems.io sandbox](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4IWAA60ATsQAEwADpo5cjMVpYI1CnIBGtAK5oAJruoYJxQ9JjnCGaQGUYxXTAjFCMabrBQMAHM4CmVVKFpaAGsAQW8MMzkI6IAhGEIIU10sDABPPTs5TBwTAGFLa1tQlSLaYjiYBN00OrSMrLlbMF04GABHQyZqQrhDMEgAD2VWOTBpTTkAcjpJWl6AWltAmAmJAAEAxjhiReVlIWO5J2JpOQBeOV6BoZgACjDVOQsrGzeAemQpxAAF0-gBKaqfR5jSavRYAKgA-ItdH8-mpZtJDIEMFA5ABpWBMGCPYiOD5Q1QeLw+OTvGqUynIRQgRRstmUOR-fB-ODA1HowxwTKBOQ0uQAAzgEtmAVFGjkOWI1EIcng3xgJiSmRJjGkWkwGmkcApjM+3PRZqhaNqkulsqCcm8VX0jhJUB1Yp8BvUMjgalsckyADdcRATKaoWDTRDTV1XgBGaNoZPKG1gGRe44iuQAdxgiygeISWowaBVfrFtEVGCiJNGgfzX3ooxwaiLcloYDF3iDaAkhmI5xb8jLFdsWoer3wM4mYPuAD5Hv1BuX-gA9P66Gf4CaogAk4OHaEuMXLhGutweY8IMk1r0vqfLLdosHwEUC7xA63Wec8t8HNQNC0ag5B-FknwuV8YHfWhP0vEV8GkDBcwlFkWQlfAlRVV4zxVR9dGQCUdgkGBqEYLV0JACVgWTKC3w-B8bkQ5DUJZDA9GoDCsPUHC8IvG4ITkIiSLIii5HYziMNo484Gg2D4OYtBAiQlC0JADB2RobjsMIXDzwI4TiN2MTNQkjT2Q5LjqJk58T3kxiEOU1S2I0zjMN0-T8MEwjjNI8izLQQwixo5MbQASXkXoYCwf0FVzGQol0WATn9MAYDMzw+1DD0tUyAchzsuSGLgpjpBYtT2JZayPN4vT+MMkSTICrUgqLXRAjqczNO0mzIJfErPxZH8-y8IDNG0MD1gg2T5H4mJgO0S97jUc87xMV5fRAsqwX6+zBrKirXJ0uqvMIBaJuoRq-NMyjWT62SHNKpyVNY9SOJqnjlXq88LpA67RJa7qpIeoqnsU8rnLeqqrJO76zr+pafKMwHxJhrSats+iYMcpTXsqtzqFq+GGuRpr-PEtqoFCtN0VGOBSJPGCZ0eg6Xpc97qrhvjfsWq6yYlTr5Cp3QsoS6QojgABCULKBAXpYHIiAWzwAAWRAACYAE42A4EBim4AhqDgAQaHoRhmB4NhgVYIA) with the full API pre-loaded, and the string example above.

### General notes

- The `...exprs` parameters of these functions can be either RegExps, strings, or arrays of `expr`s. Arrays of exprs are treated as nested sequences.

- Special characters in strings are escaped, so that `'.*'` is equivalent to `/\.\*/`.
Therefore:

    ```JS
    > sequence('.', '*').source === '\\.\\*'
    ```

    whereas:

    ```JS
    > sequence(/./', /a/).source === '.a'
    ```

- `compose-regexp` understand RegExp syntax, and will add non-capturing groups automatically where relevant. e.g. `suffix('*', '.', /\w+/)` will turn into `/(?:\.\w+)*/`

- When composing RegExps with mixed flags:
    - The `u` flag is contagious, and non-`u`. RegExps will be upgraded if possible.
    - The other flags of regexps passed as parameters are ignored, and always reset to false on the result unless set by `flags()`. This is obviously suboptimal, and will be improved in time.
- Back references (`\1`, etc...) are automatically upgraded suc that `sequence(/(\w)\1/, /(\d)\1/)` becomes `/(\w)\1(\d)\2/`. The `ref()` function lets one create refs programmatically:

    ```JS
    > sequence(capture(), ref(1))
    /()\1/
    // whereas this wouldn't work
    > sequence(capture, /\1/)
    /()\2/ // 
    ```

### Basic combinators

#### either(...exprs) : RegExp

```JS
> either(/a/, /b/, /c/)
/a|b|c/

// arrays help cut on boilerplate sequence() calls
> either(
  [/a/, /b/]
  [/c/, /d/]
)
/ab|cd/
```

----

#### sequence(...exprs) : RegExp

```JS
> sequence(/a/, /b/, /c/)
/abc/
```

`compose-regexp` inserts non-capturing groups where needed:

```JS
> sequence(/a/, /b|c/)
/a(?:b|c)/
```

----

#### suffix(quantifier, ...exprs) : RegExp
#### suffix(quantifier)(...exprs) : RegExp

Valid quantifiers:

| greedy   | non-greedy |
|----------|------------|
| `?`      | `??`       |
| `*`      | `*?`       |
| `+`      | `+?`       |
| `{n}`    | `{n}?`     |
| `{n,}`   | `{n,}?`    |
| `{m,n}`  | `{m,n}?`  |

non-string quantifiers are converted to String and wrapped in braces such that

- `suffix(3)` is equivalent to `suffix('{3}')`
- `suffix([1,3])` is equivalent to `suffix('{1,3}')`
- `suffix([2,,])` is equivalent to `suffix('{2,}')`


```JS
> suffix("*", either(/a/, /b/, /c/))
/(?:a|b|c)*/

// it is a curried function:
> zeroOrMore = suffix('*')
> zeroOrMore('a')
/a*/
```

----

#### maybe(...exprs) : RegExp

shorcut for the `?` quantifier

```JS
> maybe('a')
/a?/
```

----

#### flags(opts, ...exprs) : RegExp
#### flags(opts)(...exprs) : RegExp

```JavaScript
> flags('gm', /a/)
/a/gm
> global = flags(g); global('a')
/a/g
```

----

### Captures and References

#### capture(...exprs) : RegExp

Create an anonymous capturing group.

```JS
> capture(/a/, /b/, /c/)
/(abc)/
```

----

#### namedCapture(...exprs) : RegExp

Create an named capturing group.

```JS
> capture(/a/, /b/, /c/)
/(abc)/
```

----

#### ref(label: string) : RegExp
#### ref(n: number) : RegExp (thunk)
#### ref(n: number, depth: number) : RegExp (thunk)

When passed a number, returns a specially crafted RegExp that can't match anything as is but will be turned into a back reference when composed.
See the [back references](#back-references) section below for a detailed description

```JS
> ref("label")
/\k<label>/

> ref(1)
/$d:0,n:1^/

> sequence(capture(/./), ref(1))
/(.)\1/

// a ref to a capture two levels up the call stack
> sequence(capture(/\w/), either(capture(ref(1, 2)), /./u))
/(\w)(?:(\1)|.)/u
```

----

### Assertions

#### lookAhead(...exprs) : RegExp

Positive look ahead.

```JS
> lookAhead(/a/, /b/, /c/)
/(?=abc)/
```

----

#### notAhead(...exprs) : RegExp

Negative look ahead.

```JS
> notAhead(/a/, /b/, /c/)
/(?!abc)/
```

----

#### lookBehind(...exprs) : RegExp

*Requires an engine that supports look behind assertions*

Positive look behind.

```JS
> lookBehind(/a/, /b/, /c/)
/(?<=abc)/
```

----

#### notBehind(...exprs) : RegExp

*Requires an engine that supports look behind assertions*

Negative look behind.

```JS
> notBehind(/a/, /b/, /c/)
/(?<!abc)/
```

----

### Derived Utilites

#### atomic(...exprs) : RegExp

Returns a RegExp that will match `sequence(...exprs)`, but into which the engine won't backtrack once it has succeeded.

```JS
> atomic(/\w+?/)
/(?=(\w+?))\1/

> lookBehind(atomic(/\w+?/))
// Error, but...

> lookBehind(()=>atomic(/\w+?/))
/(?<=\1(?<=(\w+?)))/
```

`atomic()` adds an unnamed capturing group. There's no way around it as of until JS adds support for atomic groups. You'd be better off using named capturing groups if you want to extract sub-matches, they are easier the handle than match indices which go all over the place anyway when you compose RegExps. See the [atomic matching](#atomic-matching) section for more detals.

RegExps with captures have custom behavior when using `someString.split(regexp)`, which probably isn't what you want (the captures are inserted into the resulting arrays, with `undefined` for the capturing groups that didn't match). Avoid `atomic()` for that purpose.

----

#### bound(...exprs) : RegExp

*Requires an engine that supports look behind assertions*

Returns a RegExp that works like `/\b/` does, but for an arbitrary char set.

```JS
const numBound = flags.add('y', bound(/[0-9]/))

numBound.test("q88p") // false (before q)

numBound.lastIndex = 1

numBound.test("q88p") // true (between 'q' and '8')

numBound.lastIndex = 2

numBound.test("q88p") // false (between both '8')

numBound.lastIndex = 3

numBound.test("q88p") // true (between '8' and 'p')

numBound.lastIndex = 4

numBound.test("q88p") // false (after the 'p')

```

#### noBound(...exprs) : RegExp

*Requires an engine that supports look behind assertions*

`noBound(x)` returns a RegExp that succeeds where `bounds(x)` fails, and vice-versa.

----

#### charSet.difference(a, b) : RegExp
#### charSet.intersection(a, b) : RegExp
#### charSet.complement(cs) : RegExp
#### charSet.union(...cs) : RegExp

Set operations on charSets... well, operations on arbitrary RegExps, actually. They can be fed anything but are probably most useful when used with CharSets, CharClasses, and Unicode properties.

- `charSet.difference(a, b)`: returns a RegExp that matches the characters matched by `a` and don't match those of `b`

```JS
const ab = charSet.difference(/[a-d]/, /[cd]/)

ab.test(a) // true
ab.test(b) // true
ab.test(c) // false
ab.test(d) // false
```

- `charSet.intersection(a, b)`: returns a RegExp that matches characters matched by both `a` and `b`.

```JS
const bc = charSet.intersection(/[a-c]/, /[b-d]/)

bc.test(a) // false
bc.test(b) // true
bc.test(c) // true
bc.test(d) // false
```

This is especially useful when combined with Unicode properties:

```JS
const LcCyrl = charSet.intersection(/\p{Lowercase}/u, /\p{Script=Cyrillic}/u)
LcCyrl.test("б") // true
LcCyrl.test("Б") // false
LcCyrl.test("b") // false

const UcGrek = = charSet.intersection(/\p{Uppuercase}/u, /\p{Script=Greek}/u)
UcGrek.test("Γ") // true
UcGrek.test("γ") // false
UcGrek.test("W") // false

// another example
const asciiNonLetter = charSet.difference(/[\0\x7f]/, /[A-Za-z]/)
asciiNonLetter.test(":") // true
asciiNonLetter.test("a") // false

```

The full list of supported Unicode properties is [listed in the ECMAScript spec](https://tc39.es/ecma262/#sec-runtime-semantics-unicodematchproperty-p).

- `charSet.complement(cs)` : Returns a RegExp that matches when the argument doesn't

```JS
const notDF = charSet.complement(/[D-F]/)
notDF.test("C") // true
notDF.test("DEF") // false
notDF.test("G") // true

```

- `charSet.union(...cs)`: returns a RegExp that matches any of the arguments

```JS
const abcd = charSet.union(/[ab]/, /c/, /d/)

abcd.test(a) // true
abcd.test(b) // true
abcd.test(c) // true
abcd.test(d) // true
abcd.test(e) // false

```

----

## Atomic matching

Atomic groups prevent the RegExp engine from backtracking into them, aleviating the infamous ReDOS attack. JavaScript doesn't support them out of the box as of 2022, but they can be emulated using the `/(?=(your stuff here))\1/` pattern. We provide a convenient `atomic()` helper that wraps regexps in such a way, making them atomic at the boundary. Putting an `atomic()` call around an exprssion is not enough to prevent backtracking inside of it, you'll have to put them around every exprssion that could backtrack problematically. (//TODO: give examples. Feel free to open a PR or an issue do discuss this).

Also, the `atomic()` helper creates a capturing group, offsetting the indices of nested and further captures. It is better to rely on named captures for extracting values from a match, as numbered captures go all over the place when composing.

In look behind assertions (`lookBehind(...)` and `notBehind(...)` a.k.a. `/(?<=...)/` and `/(?<!...)/`) matching happens backwards. For atomic matching in lookBehind assertions, wrap the arguments inside a function, in that context, `atomic('x')` produces `/\1(?<=(x))/`.

```JS
// nope:
lookBehind(atomic(/.*?/)) // throws

lookBehind(()=>atomic(/.*?/)) // => /(?<=/\1(?<=(.*?))/)/

```

To better undestand the behavior of back-references in compound regexps, see the next section.

## Let's talk about flags

The `g`, `d` and `y` flags of input RegExps will be ignored by the combinators. The resulting RegExp will not have them (unless added manually with `flags.add()`).

The `u` flag is contagious when possible. E.G. `sequence(/./u, /a/)` returns `/.a/u`. However the meaning of `sequence(/\p{Any}/u, /./)` is ambiguous. We don't know if you want `/\p{Any}./u`, or `/\p{Any}(?![\10000-\10ffff])./u`, avoiding matches in the Astral planes, as `/./` would. In scenarios like this one, and in cases where a non-`u` RegExp whose source is not allowed in `u` mode is mixed with one that has a `u` flag, an error is thrown.

RegExps with the `m` and the `s` flags are converted to flagless regexps that match the same input. So for example `/./s` becomes `/[^]/`. The pattern is a bit more involved for `/^/` and `/$/` with the `m` flag. If your RegExp engine doesn't support look behind assertions, the `m` flag is preserved and is handled like the `i` flag (see below).

RegExps with the `i` flag can't be mixed with `i`-less RegExps, and vice-versa. You need an "all-`i`" or an "all-non-`i`" cast for a given composition (strings are fine in both cases, they are flag-agnostic).

## Back References

Regular exprssions let one reference the value of a previous group by either numbered or labeled back-references. Labeled back-references refer to named groups, whereas the index of a numbered back references can map to either a named or an unnamed group.

```JS
/(.)\1/.test("aa") // true
/(.)\1/.test("ab") // false
/(?<x>.)\1/.test("aa") // true
/(?<x>.)\k<x>/.test("aa") // true
```

`compose-regexp` takes back references into account when composing RegExps, and will update the indices of numbered refs.

```JS
sequence(/(.)\1/, /(.)\1/) // => /(.)\1(.)\2/
```

In look behind assertions, be they positive or negative, patterns are applied backward (i.e. right-to-left) to the input string. In that scenario, back references must appear before the capture they reference:

```JS
/(?<=\1(.))./.exec("abccd") //=> matches "d"
```

Patterns with back reference intended for general, forward usage will be useless in look behind context, and `compose-regexp` will reject them. If you want to use back references in patterns that are interpreted backwards, you must use a function:

```JS
// this will not work:
const errorInTheMaking = sequence(capture(/./), ref(1))
const bw = lookBehind(errorInTheMaking) // throws, thankfully

// this works, the ref is evaluated in backward context thanks to the arrow function
const bw = lookBehind(()=>[ref(1), capture(/./)])
// => /(?<=\1(.))/
```

The `atomic()` helper is direction sensitive. When called in backward context, it produces a result that will be atomic when interpreted backwards.

```JS
atomic("a") // => /(?=(a))\1/

// this will not work:
lookBehind(atomic(a)) // throws

// this will:
lookBehind(()=>atomic(a)) // => /(?<=\1(?<=(a)))
```

For scenarios where you'd like to use a back reference in a nested context, you can use the second optional `depth` parameter to `ref(n, depth)`

```JS
sequence(capture(/./), either(capture("a", ref(1, 2), "b"), /./u)
// => /(.)(?:(a\1b)|.)/u

// without depth, not what you'd want:
sequence(capture(/./), either(capture("a", ref(1), "b"), /./)
// => /(.)(?:(a\2b)|.)/
```

The depth is `2`, for the levels in the call stack(one for `capture()`, one for `either()`).

## Browser support

This library is meant to work in ES5 environments, provided you use minimal polyfills (`Object.assign()`, essentially), but it hasn't been tested in that environment. If you find bugs please send them my way. TODO: bundle the test suite for old IE testing, stripping out tests that can't work there.

Some of the library's features rely on newer RegExp features. The `u` flag can't be pulled out of thin air, for example, and neither can look behind assertions.

## Limitations and missing pieces

- `compose-regexp` will not be able to mix `i`-flagged and non-`i`-flagged without native support for the scenario. Case-insensitive matching involves case folding both the pattern and the source string, and `compose-regexp` can't access the latter.

- The logic to detect empty patterns only works for rudimentary ones (enough to deal with what we produce AFAICT). TODO: improve this

## License MIT

The MIT License (MIT)

Copyright (c) 2016 Pierre-Yves Gérardy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

