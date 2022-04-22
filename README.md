# compose-regexp.js

- Build and compose *maintainable* regular exprssions in JavaScript.
- ReDOS, begone!

### Highlights

#### Fixing ReDOS

```JS
import {atomic, sequence} from 'compose-regexp'
// classic ReDOS-vulnerable RegExp:
const ReDOS = /^(([a-z])+.)+[A-Z]([a-z])+$/

// fixed with compose-regexp, this does not backtrack
const fixed = fixed = sequence(/^/, atomic(/(([a-z])+.)+/), /[A-Z]([a-z])+$/)
```

You can test it on [flems.io](https://flems.io/#0=N4Igxg9gdgzhA2BTEAucD4EMAONEBMQAaEAMwEskZUBtUKTAW2TQDoALAF0fmPSk6IBqECAC+RekxYhWAK2olIAoZxHlG2CACdOAAmCZOERuTBE9eAI4BXIWERi9pbSb0BySJoh4AtNsQAc0QAD2wAAQAGVgA2Vkj3AB0oZIB6VL0AMXIQ8ihAvQAlRAARAHkAZT0Ad3JOdj0vLT8A4LDk5Rh9YvKqgF49VIA9AAoRmkxfAC8AXQBKAGpWRZoAQV8ALRnxydnFgBJU5LSMgDkIQT16oxrtHGw8gvrEGvYEF+LAgFEwmogbeD4KDufTVHQAaws0EQJz07EwMCuEEsjyQen++meemwmF0V3h+gARpgwODOHdSYjMFB8HpyHAsIJYXU6VA9NT2cZTGARnNGph4PBWB1oF1nDkCHoBtY7FAHCNhqkLEYTGYFWMJtN5ktFqk5hZUmtNttNXsFoc5sc5aLMRoXgMRlhCYh4BZSHy+gA+AzJPSNUXvVicO2OzDO+CWtn+2CB+AQQIjUi8yN+zqB4PML400PhyNiK2dTGILo9SpSvQhKXejOIEaJECFL69FB6esLEIWXle0sVIPFzgjEJzSOFq797IhSUDSteq4h+sUSf4Fttjt6LuexcEPtdQfDq3pMDsRCk-EvABCrmqeG00YZiDdSEYiPwEGLwP0+Hp2CwAE87+mdrYq42CINo8C-skABuEDkLSNC+q2ICYChqFoehGGoQAhPWRCIfWmGEURmA4cQ+HIcRlFoaReFRgRVEMSRuHkYxjGkckMysKQOhfCS7AjDAXrAIIJalJUAlzAA3GOXQTgQEliJGyR8HgSBgMGooiJEKAAKwAEziJIIAMMwIisGAMCKPwgjCGg4gzGIQA).

#### Combining character sets

```JS
import {bound, charSet, flags, suffix} from 'compose-regexp'

const LcGrekLetter = charSet.intersection(/\p{Lowercase}/u, /\p{Script=Greek}/u)
LcGrekLetter.test("Γ") // false
LcGrekLetter.test("γ") // true
LcGrekLetter.test("x") // false

const b = bound(/\p{Script=Greek}/u)

const LcGrekWords = flags.add('g', b, suffix("+", LcGrekLetter), b)

for (lc of `Θεωρείται ως ο σημαντικότερος θεμελιωτής ...`.matchAll(LcGrekWords)) {
  console.log(lc) //'ως', 'ο', 'σημαντικότερος', 'θεμελιωτής'
}
```

You can test it live on [flems.io](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4IWAA60ATsQAEwDMVpYI1CnIBGtAK5oAJhuqEM0gMoxiGsFAwBzOBrgwAjjqbUYTnWEgAPVjkwaRU5AHI6SVpnAFppGDsYPwkAAQAGfDCAHTQcoTh5ABlqAHF4gGtCy0ZpOQBeOWNTC2J8CGFpZ2piCHoACgB6LKyJYELaAHcYaWoMZ1YBnQ0hkeAzamkICWI6spgYcoWdAEoc4r3K6un8RgK+rJBAZOAH47kBgaCMKGcz0oqq4g1G7wYj3ECAZuAXm8PsRpO5fhcAUDbqCHn4oe9Pt8YDlcWh8vJNPUtLoDINhqN1pttrt4gcjqdcvj6AU5OcKgB1GT6Yk2exwfAYfT6PphOxhDTITTeXwQPxggDUDw07IOSOmxw0mgAuoycmAZHI+lBqHJaGA5AADQAZwIBW4EAk8CAQeBbYB64EAI8CARuBAJ3AcntgCHgOSAfuA5IBh4EA7cCAHuAPYBe4DdXsAXcCAGeA3bbHYGA4AO4FtEdtgG7gL32t2AOuAA-gy5b8FglMYAIJQKB9VXlLnSfTHV7AHJyRos2iwfBQWh2Y3UV7vML+iXhQNTsLhqOxhPJ1Pp2dZnP5wsl7JoVg5SggZywbq9NAIHhpRAADjSbA4IEwODw+GocAENHojGYPDY2tYQA).

## TOC

<!-- START toc -->
- [compose-regexp.js](#compose-regexpjs)
    - [Why you may need this lib](#why-you-may-need-this-lib)
    - [Usage](#usage)
        - [Installation](#installation)
        - [Example](#example)
    - [API](#api)
        - [In a nutshell](#in-a-nutshell)
        - [General notes](#general-notes)
        - [Details](#details)
            - [either(...exprs) : RegExp](#eitherexprs--regexp)
            - [sequence(...exprs) : RegExp](#sequenceexprs--regexp)
            - [suffix(quantifier, ...exprs) : RegExp](#suffixquantifier-exprs--regexp)
            - [suffix(quantifier)(...exprs) : RegExp](#suffixquantifierexprs--regexp)
            - [maybe(...exprs) : RegExp](#maybeexprs--regexp)
            - [flags(opts, ...exprs) : RegExp](#flagsopts-exprs--regexp)
            - [flags(opts)(...exprs) : RegExp](#flagsoptsexprs--regexp)
            - [capture(...exprs) : RegExp](#captureexprs--regexp)
            - [namedCapture(...exprs) : RegExp](#namedcaptureexprs--regexp)
            - [ref(label: string) : RegExp](#reflabel-string--regexp)
            - [ref(n: number) : RegExp](#refn-number--regexp)
            - [ref(n: number, d: number) : RegExp](#refn-number-d-number--regexp)
            - [lookAhead(...exprs) : RegExp](#lookaheadexprs--regexp)
            - [notAhead(...exprs) : RegExp](#notaheadexprs--regexp)
            - [lookBehind(...exprs) : RegExp](#lookbehindexprs--regexp)
            - [notBehind(...exprs) : RegExp](#notbehindexprs--regexp)
            - [atomic(...exprs) : RegExp](#atomicexprs--regexp)
            - [charSet.union(...cs) : RegExp](#charsetunioncs--regexp)
            - [charSet.difference(a, b) : RegExp](#charsetdifferencea-b--regexp)
            - [charSet.intersection(a, b) : RegExp](#charsetintersectiona-b--regexp)
    - [Atomic matching](#atomic-matching)
    - [Let's talk about flags](#lets-talk-about-flags)
    - [Back References](#back-references)
    - [Limitations and missing pieces](#limitations-and-missing-pieces)
    - [License MIT](#license-mit)<!-- END toc -->

## Why you may need this lib

Regular exprssions don't do justice to regular grammars.

Complex RegExps hard to read, debug and modify. For code reuse, we often resort to source string concatenation which is error prone and even less readable than RegExp literals.

Also, the matching engines are, by spec, required to backtrack on match failures. This can enable surprising behavior, and even the ReDOS attack where maliciously crafted input triggers exponential backtracking, a heavy computation that can freeze programs for hours if not for years.

**`compose-regexp` to the rescue!**

`compose-regexp` will let you take advantage of the finely honed RegExp engines shipped in Browsers while making RegExps readable, testable, and ReDOS-proof witout deep knowledge of the engines.

It doesn't make regular grammars more powerful, they are still [fundamentally limited](https://en.wikipedia.org/w/index.php?title=Chomsky_hierarchy&oldid=762040114#The_hierarchy), but since they are ubiquitous, we may as well have better tooling to put them to use...

`compose-regexp` is reasonably small (~3.6 KiB after compression), and doesn't have dependencies. You can use it as a plain dependency, or, for client-side apps, in a server-side script that generates the RegExps that you ship to the browsers.

## Usage

### Installation

```Shell
$ npm install --save compose-regexp
```

### Example

```JS
import {capture, either, ref, sequence, suffix} from "compose-regexp"

// Let's match a string, here's a naive RegExp that recognizes strings
// with single or double quotes.

const Str = sequence(
    capture(/['"]/),
    suffix('*?', // a frugal Kleene star
        either (
            ["\\", /./s], // using the `s` flag to match escaped line terminators
            /./            // no `s` flag here, bare line terminators are invalid
        )
    ),
    ref(1)
)
// equivalent to
const Str = /(['"])(?:\\[^]|.)*?\1/
```

Let's test it. For the docs' sake, `console.log()` will be out test harness.

```JS
// for testing we'll add anchors to make sure we consume all of the input
const anchored = (...x) => sequence(/^/, ...x, /$/)
const AnchStr = anchored(Str)
// a.k.a.
const AnchStr = /^(['"])(?:\\[^]|.)*?\1$/

console.log(String.raw`""`.match(AnchStr), [`expected ""`])
console.log(String.raw`"abc"`.match(AnchStr), [`expected "abc"`])
console.log(String.raw`"a\"c"`.match(AnchStr), [`expected "a\\"c"`])
console.log(String.raw`"abc`.match(AnchStr), [`expected null`])
// It seems to work, let's feed it invalid input
console.log(String.raw`"a"c"`.match(AnchStr), [`expected null, got "a"c"`])
```

Backtracking bites us here. We can remedy the issue by using `atomic` helper

```JS
import {atomic} from 'compose-regexp'

const AnchAtomicStr = anchored(atomic(Str))
// that would be
const AnchAtomicStr = /^(?=((['"])(?:\\[^]|.)*?\2))\1$/

console.log(String.raw`""`.match(AnchAtomicStr), [`expected ""`])
console.log(String.raw`"abc"`.match(AnchAtomicStr), [`expected "abc"`])
console.log(String.raw`"a\"c"`.match(AnchAtomicStr), [`expected "a\\"c"`])
console.log(String.raw`"abc`.match(AnchStr), [`expected null`])
// suspense...
console.log(String.raw`"a"c"`.match(AnchAtomicStr), [`got null, it works!`])

```

And we got it done!

## API

### In a nutshell

```JS
// Core combinators
either(...exprs) //  /a|b/
sequence(...exprs) // /ab/
suffix(quantifier, ...exprs) // /a+/, /(?:a|b){1,3}/
maybe(...exprs) // shortcut for `suffix('?', ...)`
flags.add(flags, ...exprs) // add flags


// captures and references
capture(...exprs)
namedCapture(label, ...exprs)
ref(nuberOrLabel)


// predicates
lookAhead(...exprs) // positive look ahead: /(?=...)/
notAhead(...exprs)     // negative look ahead: /(?!...)/
lookBehind(...exprs) // positive look behind: /(?<=...)/
notBehind(...exprs) // negative look behind: /(?<!...)/

// other functions
atomic(...exprs) // helper to prevent backtracking

bound(...exprs) // like /\b/, but for arbitrary charSets rather than just \w

charSet.union(...cs) // character that match any of the provided charsets
charSet.difference(a, b) // characters that match charSet `a` and don't match charSet `b`
charSet.intersection(a, b) // characters that match both charSet `a` and charSet `b`

// The lack of non-capturing group API is deliberate. We insert them
// automatically where needed, they are not a user concern when using
// this lib.
```

Here's a [flems.io sandbox](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4IWAA60ATsQAEwADpo5cjMVpYI1CnIBGtAK5oAJruoYJxQ9JjnCGaXBjFdMCMUIxpusFAwA5nAUyqpQtLQA1gCCXhhmcuFRAEIwhBCmulgYAJ56dnKYOCYAwpbWtiEqhbTEsTDxumi1qemZcrZgus4AjoZM1AVwhmCQAB7KrHJgMlhyAOR0krTOALS2ATBjEgACAAz4AGz4e-PKykJw8gDKxNJyALxyvf1ogwAUoapyFlY2MO8APTIM4gAC6gIAlFVvs8RuN3vMAFQAfnmukBgLU02khgCGCgcgA0rAmDBnsRHF9Yap3J5vHJPtUaTTkIoQIpOZzKHJAfhAXAwRisYY4BkAnJ6XIAAZwaXTfwSjRybLEaiEOTwX4wEyJDLkxjSLSYDROaks758rEW2GYmoyuUKwJyLyVfSOclQfWS7zG9QyOBqWxyDIANwJEBM5thkPN0PNnXeAEZY2hU8o7TN7owruK5AB3GDzKCE+K6jBvQgByW0FUYSLk4bBws-ejDHBqEtyWhgSVeENoCSGYgXNvyCvqmQ6x6M-BzsaQx4APmeMD6AwBgIAeoDdHP8GMMQASKGjtBXOTRSu3e5PCdV2wmd439NvNu0WD4cIBT4gVarAsPCrYc1A0LRqDkf92VfS4PxgL9aB-G9xXwaQMHzaV2XZaV8FVdV3ivdUX10ZBpS2CQYGoRhdSwkBpTBVNYM-b9nzuFC0Iw9kMD0ahsNw9R8MIwhiLkUjyMo6i5C4njsIYs84DghCkLYtAAlQ9DMJADAuRoPi8MIAjrzuaFRLI7YJOnLiuW5Xi6Lkt9z0UljkNU9TOK0nicP0wyiOMkizIoqjpzQQwS3o1M7QASXkZwYCwQNlXzGRIl0WBiHmQMwBgacPAHcMvV1DIhxHByFOYxDWOkdiNKs3S6P4tUDKEkSxPMoLdRCktdACWopK09lbPC85Sqcir2X-QDPFAzRtEg1ZoPk+QhOiMDtBvGd7ynJ9-XAyrIRg99yuUqrXI4zS9IEprKxWmbqBagKLJojk7MYw74OclS1LO6TBoawTrtWu6-NM8T2r67jBvspj3oqlyvpq-qbIuxqfMIG7wPu0HJKs6y6qGkajsq6r3IhrzLtRzG2skzqoHxu1hjgCjz3gud5NG47ic07S8b+q71XRtbgdInr5Bp3RcqS6RIjgABCcLKBAZxYCoiA2zwQ5ED2NgOBAIpuAIag4AEGh6EYZgeDYMFWCAA) with the full API pre-loaded, and the string example above.

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

### Details

----

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
#### ref(n: number) : RegExp
#### ref(n: number, d: number) : RegExp

When passed a number, returns a specially crafted RegExp that can't match anything as is but will be turned into a back reference when composed.
See the [back references](#back-references) section below for a detailed description

```JS
> ref("label")
/\k<label>/

> ref(1)
/($ ^d:0,n:1)/

> sequence(capture(/./), ref(1))
/(.)\1/

// a ref to a capture two levels up the call stack
> sequence(capture(/\w/), either(capture(ref(1,2)), /./u))
/(\w)(?:(\1)|.)/u
```

----

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

Positive look behind.

```JS
> lookBehind(/a/, /b/, /c/)
/(?<=abc)/
```

----

#### notBehind(...exprs) : RegExp

Negative look behind.

```JS
> notBehind(/a/, /b/, /c/)
/(?<!abc)/
```

----

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

----

#### charSet.union(...cs) : RegExp
#### charSet.difference(a, b) : RegExp
#### charSet.intersection(a, b) : RegExp

Set operations on charSets... well, operations on arbitrary RegExps, actually. They can be fed anything but are probably most useful when used with CharSets, CharClasses, and Unicode properties.

- `charSet.union(...cs)`: returns a RegExp that matches any of the arguments

```JS
const abcd = charSet.union(/[ab]/, /c/, /d/)

abcd.test(a) // true
abcd.test(b) // true
abcd.test(c) // true
abcd.test(d) // true
abcd.test(e) // false

```

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

// this works
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

## Limitations and missing pieces

- `compose-regexp` will not be able to mix `i`-flagged and non-`i`-flagged without native support for the scenario. Case-insensitive matching involves case folding both the pattern and the source string, and `compose-regexp` can't access the latter.


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

