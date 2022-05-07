## Contributing to compose-regexp.js

`compose-regexp` is most likely feature-complete. You may suggest improvements, but be warned that they are likely not to be accepted... However, don't let that stop you from proposing ideas, just don't set your expectations too high, and be courteous with the people you interact with around here.

If you found a bug feel free to open an issue or submit a PR.

The coding style may be a bit awkward.

`compose-regexp` was started at a time where I still cared about IE compatibility and wanted to support ES6 modules. To keep the tooling minimal, I decided to write it in ES5 + ES6 modules, using Rollup as a bundler to create the UMD (and the bragging artefacts in `./dist`). The old version of Rollup that I use understands exactly that dialect, and I kept it when I started updating the lib in 2022. It is annoying when dealing with vararg functions, but otherwise a soothing experience for me, actually.

The core has comments that will hopefully help you navigate the code base. Single quoted strings are used everywhere except for error messages.

The tests are written using [ospec](https://github.com/MithrilJS/ospec), which has a very shallow learning curve, using two dedicated `.satisfies()` helpers (`m()` and `r()`) that should be self-documenting in context.