# compose-regexp.js

A set of functions to build and compose complex regular expressions in JavaScript. 

The goal of this library is to enable advanced RegExp users to write maintainable lexers and parsers. A reasonable understanding of the parsing model of regexps is a prerequisite.

## Usage

```Shell
$ npm install --save compose-regexp
```

```JS
import {
    sequence, either, capture,
    ref, greedy
} from "compose-regexp"; // can be required too

// the example that made me write this, in order to ~lex JS.
// It matches braces in source code, but skips comments and strings.
let matcher = flags('gm',
    either(
        sequence(
            capture(/['"`]/),
            greedy('*', // a greedy zero-or-more repetition
                either(
                    sequence('\\', ref(1)),
                    '\\\\',
                    sequence(avoid(ref(1)), /[\s\S]/)
                )
            ),
            ref(1)
        ),
        sequence(
            '/*',
            greedy('*',
                avoid('*/'),
                /[\s\S]/
            ),
            '*/'
        ),
        sequence('//', /[^\n]*\n/),
        capture(either(/[{}]/, '}}'))
    )
);

// matcher:

/(?:(['"`])(?:(?:\\\1|\\\\|(?!\1)[\s\S]))*\1|\/\*(?:(?!\*\/)[\s\S])*\*\/|\/\/[^\n]*\n|((?:[{}]|\}\})))/gm

// The most astute among you may have noticed that regexes in the subject string
// would still trip that parser. Not perfect, but still useful.
```

## API

### General (important) notes:

The `regexp` parameters of these functions can be either RegExps or strings.
Special characters in strings are escaped, so that `'.*'` is equivalent to `/\.\*/`.
Therefore:

```JS
> sequence('.', '*').source
'\\.\\*'
```

The flags of intermediate regexps are ignored, and always reset to false unless set by `flags()`.

#### flags(opts, regexps...)

```JavaScript
> flags('gm', /a/)
/a/gm
```

#### either(regexps...) 

```JS
> either(/a/, /b/, /c/)
/(?:a|b|c)/
```

#### sequence(regexps...) 

```JS
> sequence(/a/, /b/, /c/)
/abc/
```

#### group(regexps...)

```JS
> group(/a/, /b/, /c/)
/(?:abc)/
```

#### lookAhead(regexps...) 

```JS
> lookAhead(/a/, /b/, /c/)
/(?=abc)/
```

#### avoid(regexps...) 

Negative look ahead

```JS
> avoid(/a/, /b/, /c/)
/(?!abc)/
```

#### greedy(suffix, regexprs...) 

Valid suffixes: (`?`, `*`, `+`, `{n}`, `{n,}` and `{m, n}`)

```JS
> greedy("*", either(/a/, /b/, /c/))
/(?:a|b|c)*/
> maybe = greedy.bind(null, '?'); maybe(either('a', 'b'))
/(?:a|b)?/
```

#### frugal(suffix, regexprs...) 

Like `greedy()` but for non-greedy operators (`??`, `*?`, `+?`, `{n}?`, `{n,}?` and `{m, n}?`).

```JS
> frugal("{1,3}", either(/a/, /b/, /c/))
/(?:a|b|c){1,3}?/
```

#### capture (regexprs...)

```JS
> capture(/a/, /b/, /c/)
/(abc)/
```

#### ref(n) 

```JS
> ref(1)
/\1/
```

*Caveat emptor*, references are absolute. Therefore, refs may be broken if you compose two regexps that use captures.

```JS

stringMatcher = sequence(
    capture(/['"`]/),
    greedy('*', // a greedy zero-or-more repetition
        either(
            sequence('\\', ref(1)),
            '\\\\',
            sequence(avoid(ref(1)), /[\s\S]/)
        )
    ),
    ref(1)
)

whooops = sequence(
    capture('foo'),
    stringMatcher
)
```

In `whoops`, the `ref(1)` in stringMatcher actually refers to `foo`, not the opening quote.

Fixing this would require an approach far more complex than what I'm doing now (concat the regexps source).

## Notes

This tool is very simple under the hood and its output is not optimised for either size or speed. For example, you may find that some non-capturing groups are superfluous. Getting rid of these would require parsing the regexps under the hood to simplify them, and it is beyond the scope of this project at this time.

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

