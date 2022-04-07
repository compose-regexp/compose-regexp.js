

# compose-regexp.js

Build and compose *maintainable* regular expressions in JavaScript.

Regular expressions don't do justice to regular grammars.

- The regular grammar/language formalism is all about [expression composition](https://en.wikipedia.org/w/index.php?title=Regular_language&oldid=748009543#Formal_definition).
- Yet RegExps were designed as a [write-only syntax for command line tools](https://en.wikipedia.org/w/index.php?title=Regular_expression&oldid=762174774#History) like `ed` and `grep`.
- Building large expressions from smaller, abstracted patterns is not possible using RegExp literals.

This makes complex RegExps hard to read, debug and modify...

`compose-regexp` to the rescue!

It doesn't make regular grammars more powerful, they are still [fundamentally limited](https://en.wikipedia.org/w/index.php?title=Chomsky_hierarchy&oldid=762040114#The_hierarchy), but since they are ubiquitous, we may as well have better tooling to implement them...

## Usage

```Shell
$ npm install --save compose-regexp
```

```JS
import {
    sequence, either, capture,
    ref, suffix, flags, avoid
} from "compose-regexp"; // can be required too

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
    "`"
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

- The `exprs...` parameters of these functions can be either RegExps, strings, or arrays of `expr`s. Arrays of exprs are treated as nested sequences.

- Special characters in strings are escaped, so that `'.*'` is equivalent to `/\.\*/`.
Therefore:

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


#### flags(opts, exprs...), flags(opts)(exprs...)

```JavaScript
> flags('gm', /a/)
/a/gm
> global = flags(g); global('a')
/a/g
```

#### either(exprs...)

```JS
> either(/a/, /b/, /c/)
/a|b|c/
```

#### sequence(exprs...)

```JS
> sequence(/a/, /b/, /c/)
/abc/
```

ComposeRegexp inserts non-capturing groups where needed:

```JS
> sequence(/a/, /b|c/)
/a(?:b|c)/
```

#### lookAhead(exprs...)

```JS
> lookAhead(/a/, /b/, /c/)
/(?=abc)/
```

#### avoid(exprs...)

Negative look ahead

```JS
> avoid(/a/, /b/, /c/)
/(?!abc)/
```

#### lookBehind(exprs...)

Look behind

```JS
> lookBehind(/a/, /b/, /c/)
/(?<=abc)/
```

#### notBehind(exprs...)

Negative look behind

```JS
> notBehind(/a/, /b/, /c/)
/(?<!abc)/
```

#### suffix(operator, exprrs...), suffix(operator)(exprrs...)

Valid operators:

| greedy   | non-greedy |
|----------|------------|
| `?`      | `??`       |
| `*`      | `*?`       |
| `+`      | `+?`       |
| `{n}`    | `{n}?`     |
| `{n,}`   | `{n,}?`    |
| `{m,n}` | `{m,n}?`  |


```JS
> suffix("*", either(/a/, /b/, /c/))
/(?:a|b|c)*/
> maybe = suffix('?'); maybe('a')
/a?/
```

#### capture (exprs...) : RegExp

```JS
> capture(/a/, /b/, /c/)
/(abc)/
```

#### ref(n: number|string) : Thunk<Regexp>

See the [back references](#back-references) section below for a detailed description

```JS
> ref(1)          // Object.assign(() => "\\1", {ref: true})
() => "\\1"
> ref("label")    // Object.assign(() => "\\k<label>", {ref: true})
() => "\\k<label>"
```

#### atomic(...expression) : RegExp

> atomic(/\w+?/)

### Atomic matching

Atomic groups prevent the RegExp engine from backtracking into them, aleviating the infamous ReDOS attack. JavaScript doesn't support them out of the box, but they can be emulated using the `/(?=(your stuff here))\1/` pattern. We provide a convenient `atomic()` helper that wraps regexps, making them atomic at the boundary. Putting an `atomic()` call around an expression is not enough to prevent backtracking, you'll have to put them around every expression that could backtrack pathologically.

Also, the `atomic()` helper creates a capturing group, offsetting the indices of nested and further captures. It is better to rely on named captures for extracting values.

In look behind assertions (`lookBehind(...)` and `notBehind(...)` a.k.a. `/(?<=...)/` and `/(?<!...)/`) matching happens backwards. For atomic matching in lookBehind assertions, wrap the construction of your pattern inside a `buildLookBehind(()=>...)` call, in that context, `atomic('x')` produces `/\1(?<=(x))/`.

To better undestand the behavior of back-references in compound regexps, see the next section.

### Back References

Regular expressions let one reference the value of a previous group by either numbered or labeled back-references. Labeled back-references


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

