# Change Log

## v0.7.0

*2023-03-19*

- [breaking] Actually reject lone quantifier brackets in input

## v0.6.31

*2023-03-19*

- Avoid creating quantifiers by accident. Now `sequence(/a{/, /1}/)` returns `/a{(?:)1}/`. Fixes [#10](https://github.com/compose-regexp/compose-regexp.js/issues/10)

## v0.6.30

*2023-02-08*

- Add a package.json file to the commonjs folder such that `require("compose-regexp")` works.

## v0.6.29

*2023-01-30*

- Docs: correct typo in the README ([#9](https://github.com/compose-regexp/compose-regexp.js/pull/9) [@Kawacrepe](https://github.com/Kawacrepe))

## v0.6.28

*2023-01-27*

- ES6 conversion, bump babel, switch to terser. The .min.br file is 92 bytes lighter as a result.

## v0.6.27

*2023-01-14*

- More logo tweaks

## v0.6.26

*2023-01-13*

- Merge README fixes (version bump for the npm README).

## v0.6.25

*2023-01-13*

- Cosmetic tweaks to the logo (version bump for the npm README).

## v0.6.24

*2022-05-21*

### Bug fixes

- Bump `ref()` indices when directly nested in a `capture()` call.

## v0.6.23

*2022-05-19*

### Bug fixes

- Better character class detection, resulting in fewer non-capturing groups being inserted when adding quantifiers.

## v0.6.22

*2022-05-08*

### Bug fixes

- Better handling of empty parameter lists.

## v0.6.21

*2022-05-08*

### Bug fixes

- Actually fix the last bug...

## v0.6.20

*2022-05-08*

Address various lgtm.com concerns

### Bug fixes

- Remove a ReDOS vuln in the quantifier validator. `atomic()` FTW, but where's my credibility now?

## v0.6.19

*2022-05-08*

- Docs tweaks

## v0.6.18

*2022-05-07*

### Bug fixes

- Fix the `flags.add` typings

## v0.6.17

*2022-05-07*

### Bug fixes

- Correctly handle variadic params in TS

## v0.6.16

*2022-05-07*

### New features

- Better TypeScript typings

## v0.6.15

*2022-05-06*

### New features

- Added TypeScript typings

## v0.6.11, v0.6.12, v0.6.13, v0.6.14

*2022-05-05*

### Bug fixes

- Fix the postinstall script and other NPM-related shenanigans

## v0.6.10

*2022-05-05*

Another dummy release to test the npm postpublish script

## v0.6.9

*2022-05-04*

### Improvements

- Tweak the back reference thunk format

## v0.6.8

*2022-05-04*

Dummy release to test the npm publish script

## v0.6.7

*2022-05-04*

### Improvements

- More efficient and terser set intersection

## v0.6.6

*2022-05-02*

### Bug fixes

- Publish AMD and artefacts

## v0.6.5

*2022-05-02*

### Bug fixes

-  Ignore look behind assertions when counting captures

## v0.6.4

*2022-04-25*

### Bug fixes

- Fix another bug when upgrading non-u regexps to u

## v0.6.3

*2022-04-24*

### Bug fixes

- Better logic to upgrade non-u regexp to unicode

## v0.6.2

*2022-04-22*

### New features

- `noBound(x)` matches where `bound(x)` doesn't and vice-versa. Think `/\B/` vs `/\b/`.
- `charSet.invert(x)` will succeed where `x` doesn't and vice-versa. think `/[^a-z]/` vs `/[a-z]/`

### Bug fixes

- Fix a typo in the mixed m-flag detection code for legacy environments
- added Compatibility and Contribution sections in the README

## v0.6.1

*2022-04-22*

Doc tweaks for the npm README

## v0.6.0 (things are getting serious)

*2022-04-22*

This version revamps the core to provide better support for the `u` flag. The `ref()` story is also far more robust. `ref()` lets us introduce an `atomic()` helper that prevents the engine from backtracking.

### Breakin changes

- `avoid()` becomes `notAhead()` (mirroring the newly introduced `lookBehind()`, `notBehind()` scheme).
- back references (e.g. `\1`) are now updated when regexps that hold them are combined. `sequence(/(.)\1/, /(.)\1/)` returns `/(.)\1(.)\2/`
- `ref()` now returns a thunk, to let one create back references programmatically. `sequence(/(.)/, ref(1))` returns `/(.)\1/`
- The `u` flag is now contagious, non-unicode RegExps are promoted to unicode when possible.
- RegExp with an `m` or `s` flag are converted into flagless equivalent that match the same input (e.g. `/./s` => `/[^]/`)
- We're now stricter WRT input. Pass in a bad argument, and you'll ~~meet the wrath of our ...~~ get a nice error message.
- Beside `u` promotion and `m` and `s` folding, the combinators don't accept mixed flags as input.

### New features

- `atomic(...exprs)` will create an atomic group that prevents backtracking into the expression once it has matched. ReDOS, begone! `atomic()` is direction sensitive, see below).
- `bound(pattern)` generalizes the `/\b\` assertion to arbitrary character classes (or patterns, really)
- `charSet.*()` methods let one do set arithmetics on character sets.
- The combinators also accept as parameters, string, regexps, or arrays of parameters and functions that return parameters. An Arrays is treated like `sequence()`. Functions come in handy for look behind assertions.
- `ref("label")` creates a named reference (`/\k<label>/`).
- `namedCapture("label", ...)` returns (`/(?<label>...)/`)
- support `lookBehind()` and `notBehind()` assertions.
- pattern directionality. Patterns that contain numeric back-references have an assorted direction depending on the context where they are evaluated, and they can't be mixed. The default is forward, so `lookBehind(ref(1), capture(/\w/))` will be rejected. `lookBehind(()=>[ref(1), capture(/\w/)])` however will do what you want, because the function is then evaluated in backward context.

### Bug fixes

- fix the exports paths in `package.json`

### Shout out

... to [@Hypercubed](https://github.com/Hypercubed) who submitted a [PR](https://github.com/pygy/compose-regexp.js/pull/5) for an issue that was solved independently.

## v0.5.3

- fix broken package.json

## v0.5.2

- added an auto-curried version of `flags()`.
- ported the full test suite to ospec

## before

Here be drgns...
