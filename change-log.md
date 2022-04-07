# Change Log


## v0.6.0 (things are getting serious)

***2022-04-06***

This version revamps the core to provide better support for the `u` flag. The `ref()` story is also far more robust.

### Breakin changes

- back references (e.g. `\1`) are now updated when regexps that hold them are combined. `sequence(/(.)\1/, /(.)\1/)` returns `/(.)\1(.)\2/`
- `ref()` now returns a thunk, to let one create back references programmatically. `sequence(/(.)/, ref(1))` returns `/(.)\1/`
- The `u` flag is now contagious, non-unicode RegExps are promoted to unicode when possible.
- We're now stricter WRT input. Pass in a bad argument, and you'll ~~meet the wrath of our ...~~ get a nice error message.
- Beside u promotion, the combinators don't accept mixed flags as input.

### New features

- The combinators also accept arrays of string, regexps, or arrays or the previous three.
- `ref("label")` creates a named reference (`/\k<label>/`).
- `namedCapture("label", ...)` returns (`/(?<label>...)/`)
- support `lookBehind()` and `notBehind()` assertions

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
