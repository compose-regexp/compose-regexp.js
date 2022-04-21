# compose-regexp.js

> Build and compose *maintainable* regular exprssions in JavaScript. Avoid ReDOS!

## Why you may need this lib

Regular exprssions don't do justice to regular grammars.

Complex RegExps hard to read, debug and modify. For code reuse, programers often resort to source string concatenation which is error prone and even less readable than RegExp literals.

Also, the matching engines are, by spec, required to backtrack on match failures. This can enable surprising behavior, and even the ReDOS attack where exponential backtracking triggers a very heavy computation that can freeze your programs for hours or years.

**`compose-regexp` to the rescue!**

`compose-regexp` will let you take advantage of the finely honed RegExp engines shipped in Browsers while making RegExps readable, testable, and ReDOS-proof witout deep knowledge of the engines.

It doesn't make regular grammars more powerful, they are still [fundamentally limited](https://en.wikipedia.org/w/index.php?title=Chomsky_hierarchy&oldid=762040114#The_hierarchy), but since they are ubiquitous, we may as well have better tooling to put them to use...

`compose-regexp` is reasonably small (~3.6 KiB after compression), and doesn't have dependencies. You can also use as a part of your app, or, for client-side apps, in a server-side script that generates the RegExps that you ship to the browsers.

## Usage

```Shell
$ npm install --save compose-regexp
```

### Example

```JS
import {
    sequence, either, capture,
    ref, suffix, flags, avoid
} from "compose-regexp";

// the example that made me write this, in order to ~lex JS.
// It matches braces in source code, but skips comments and strings.

const string = either(
  sequence(
    '"',
    suffix('*?', // a non-greedy zero-or-more repetition
      either(
        /\\[\s\S]/,
        /./
      )
    ),
    '"'
  ),
  sequence(
    "'",
    suffix('*?',
      either(
        /\\[\s\S]/,
        /./
      )
    ),
    "'"
  ),
  sequence(
    "`",
    suffix('*?',
      either(
        /\\[\s\S]/,
        /[\s\S]/
      )
    ),
    either("`", "${")
  )
)

const multiLineComment = sequence(
  '/*',
  suffix('*?',
    /[\s\S]/
  ),
  '*/'
)
const singleLineComment = sequence('//', /[^\n]*\n/)

const comment = either(multiLineComment, singleLineComment)

const matcher = flags('gm',
    either(
        comment,
        string,
        capture(either(/[{}]/, '}}'))
    )
);

// matcher:

/\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|"(?:\\[\s\S]|.)*?"|'(?:\\[\s\S]|.)*?'|`(?:\\[\s\S]|[\s\S])*?`|([{}]|\}\})/gm

// The most astute among you may have noticed that regexes in the subject string
// would still trip that parser. Not perfect, but still useful.
```

## API

### General notes:

- The `...exprs` parameters of these functions can be either RegExps, strings, or arrays of `expr`s. Arrays of exprs are treated as nested sequences.

- Special characters in strings are escaped, so that `'.*'` is equivalent to `/\.\*/`.
Therefore:

- `compose-regexp` understand RegExp syntax, and will add non-capturing groups automatically where relevant. e.g. `suffix('*', '.', /\w+/)` will turn into `/(?:\.\w+)*/`
```JS
> sequence('.', '*').source === '\\.\\*'
```

whereas:

```JS
> sequence(/./', /a/).source === '.a'
```

- When composing RegExps with mixed flags:

    - The `u` flag is contagious, and non-`u`. RegExps will be upgraded if possible.

    - The other flags of regexps passed as parameters are ignored, and always reset to false on the result unless set by `flags()`. This is obviously suboptimal, and will be improved in time.
- Back references (`\1`, etc...) are automatically upgraded suc that `sequence(/(\w)\1/, /(\d)\1/)` becomes `/(\w)\1(\d)\2/`. The `ref()` function lets one create refs programmatically:

```js
const possessive = x => sequence(capture(lookFor(x)), ref(1))

const string = sequence(
  capture(either("'", '"')),
  possessive(suffix("*", either(
    ["\\", /./],
    [avoid(ref(1)), /./]
  ))),
  ref(1)
)
)
```

### in a nutshell:

```JS
// Core combinators
either(...) //  /a|b/
sequence(...) // /ab/
suffix(quantifier, ...) // /a+/, /(?:a|b){1,3}/
maybe(...) // shortcut for `suffix('?', ...)`


// predicates
avoid(...)     // negative lookAhead: /(?!...)/
lookAhead(...) // positive lookahead: /(?=...)/
lookBehind(...) // positive behind: /(?<=...)/
notBehind(...) // negative behind: /(?<!...)/

// captures and references 
capture(...)
namedCapture(name, ...)
ref(nuberOrLabel)

// helpers
atomic(...) // helper to prevent backtracking
flags.add(...) // add flags
```

###


#### flags(opts, ...exprs), flags(opts)(...exprs)

```JavaScript
> flags('gm', /a/)
/a/gm
> global = flags(g); global('a')
/a/g
```

#### either(...exprs)

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

#### sequence(...exprs)

```JS
> sequence(/a/, /b/, /c/)
/abc/
```

`compose-regexp` inserts non-capturing groups where needed:

```JS
> sequence(/a/, /b|c/)
/a(?:b|c)/
```

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

#### maybe(...exprs)

shorcut for the `?` quantifier

```JS
> maybe('a')
/a?/
```

#### lookAhead(...exprs)

```JS
> lookAhead(/a/, /b/, /c/)
/(?=abc)/
```

#### avoid(...exprs)

Negative look ahead

```JS
> avoid(/a/, /b/, /c/)
/(?!abc)/
```

#### lookBehind(...exprs)

Look behind

```JS
> lookBehind(/a/, /b/, /c/)
/(?<=abc)/
```

#### notBehind(...exprs)

Negative look behind

```JS
> notBehind(/a/, /b/, /c/)
/(?<!abc)/
```

#### capture (...exprs) : RegExp

```JS
> capture(/a/, /b/, /c/)
/(abc)/
```

#### ref(n: number) : Thunk<Regexp>
#### ref(label: string) : RegExp

See the [back references](#back-references) section below for a detailed description

```JS
> ref(1)          // Object.assign(() => "\\1", {ref: true})
() => "\\1"

> ref("label")    // Object.assign(() => "\\k<label>", {ref: true})
/\k<label>/
```

#### atomic(...exprs) : RegExp

```JS
> atomic(/\w+?/)
/(?=(\w+?))\1/

>lookBehind(()=>atomic(/\w+?/))
/(?<=\1(?<=(\w+?)))/
```

Atomic adds an unnamed capturing group. There's no way around it as of until JS adds support for atomic groups. You'd be better off using named capturing groups if you want to extract sub-matches, they are easier the handle than match indices.

### Atomic matching

Atomic groups prevent the RegExp engine from backtracking into them, aleviating the infamous ReDOS attack. JavaScript doesn't support them out of the box as of 2022, but they can be emulated using the `/(?=(your stuff here))\1/` pattern. We provide a convenient `atomic()` helper that wraps regexps in such a way, making them atomic at the boundary. Putting an `atomic()` call around an exprssion is not enough to prevent backtracking, you'll have to put them around every exprssion that could backtrack problematically.

Also, the `atomic()` helper creates a capturing group, offsetting the indices of nested and further captures. It is better to rely on named captures for extracting values.

In look behind assertions (`lookBehind(...)` and `notBehind(...)` a.k.a. `/(?<=...)/` and `/(?<!...)/`) matching happens backwards. For atomic matching in lookBehind assertions, wrap the arguments inside a function, in that context, `atomic('x')` produces `/\1(?<=(x))/`.

To better undestand the behavior of back-references in compound regexps, see the next section.

### Flags of input and output RegExps

The `g`, `d` and `y` flags of input RegExps will be ignored by the combinators. The resulting RegExp will not have them (unless added manually with `flags.add()`).

The `u` flag is contagious when possible. E.G. `sequence(/./u, /a/)` returns `/.a/u`. However the meaning of `sequence(/\p{Any}/u, /./)` is ambiguous. We don't know if you want `/\p{Any}./u`, or `/\p{Any}(?![\10000-\10ffff])./u`, avoiding matches in the Astral planes, like `/./` would do. In scenarios like this one, and in scenarios where a non-`u` RegExp whose source is not allowed in `u` mode is mixed with one that has a `u` flag, an error is thrown.

RegExps with the `m` and the `s` flags are converted to flagless regexps that match the same input. So for example `/./s` becomes `/[^]/`. The pattern is a bit more involved for `/^/` and `/$/` for the `m` flag. If your RegExp engine doesn't support look behind assertions, the `m` flag is preserved and is handled like the `i` flag (see below).

RegExps with the `i` flag can't be mixed with `i`-less RegExps, and vice-versa. You need an "all-`i`" or an "all-non-`i`" cast for a given composition (strings are fine in both cases, they are flag-agnostic).

### Back References

Regular exprssions let one reference the value of a previous group by either numbered or labeled back-references. Labeled back-references

### Limitations and missing pieces

- `compose-regexp` will not be able to mix `i`-flagged and non-`i`-flagged without native support for the scenario. Case-insensitive matching involves case folding both the pattern and the source string, and `compose-regexp` can't access the latter.

- there is no way to exprss `/(a)(b\1c)/` programmatically. We'd need to add an optional second `nested` argument to `ref(n)`, and completely revamp the core for that to happen. Hypothetic API: `sequence(()=>[capture('a'), capture('b', ref(1, -1), 'c')])`.

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

