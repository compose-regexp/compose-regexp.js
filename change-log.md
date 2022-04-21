# Change Log


## v0.6.0 (things are getting serious)

***2022-04-06***

This version revamps the core to provide better support for the `u` flag. The `ref()` story is also far more robust. `ref()` lets us introduce an `atomic()` helper that prevents the engine from backtracking.

### Breakin changes

- back references (e.g. `\1`) are now updated when regexps that hold them are combined. `sequence(/(.)\1/, /(.)\1/)` returns `/(.)\1(.)\2/`
- `ref()` now returns a thunk, to let one create back references programmatically. `sequence(/(.)/, ref(1))` returns `/(.)\1/`
- The `u` flag is now contagious, non-unicode RegExps are promoted to unicode when possible.
- RegExp with an `m` or `s` flag are converted into flagless equivalent that match the same input (e.g. `/./s` => `/[^]/`)
- We're now stricter WRT input. Pass in a bad argument, and you'll ~~meet the wrath of our ...~~ get a nice error message.
- Beside `u` promotion and `m` and `s` folding, the combinators don't accept mixed flags as input.

### New features

- `atomic(...exprs)` will create an atomic group that prevents backtracking into the expression once it has matched. ReDOS, begone! `atomic()` is direction sensitive, see below).
- The combinators also accept as parameters, string, regexps, or arrays of parameters and functions that return parameters. An Arrays is treated like `sequence()`. Functions come in handy for look behind assertions.
- `ref("label")` creates a named reference (`/\k<label>/`).
- `namedCapture("label", ...)` returns (`/(?<label>...)/`)
- support `lookBehind()` and `notBehind()` assertions.
- pattern directionality. Patterns that contain numeric back-references have an assorted direction depending on the context where they are evaluated, and they can't be mixed. The default is forward, so `lookBehind(ref(1), capture(/\w/))` will be rejected. `lookBehind(()=>[ref(1), capture(/\w/)])` however will do what you want, because the function is then evaluated in backward context.

### Bug fixes

- fix the exports paths in `package.json`

### Shout out

... to [@Hypercubed](https://github.com/Hypercubed) who submitted a [PR](https://github.com/pygy/compose-regexp.js/pull/5) fo an issue that was solved independently.

## v0.5.3

- fix broken package.json

## v0.5.2

- added an auto-curried version of `flags()`.
- ported the full test suite to ospec

## before

Here be drgns...
