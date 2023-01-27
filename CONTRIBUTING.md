## Contributing to compose-regexp.js

`compose-regexp` is most likely feature-complete (beside advanced type checking). You may suggest improvements, but be warned that they are likely not to be accepted... However, don't let that stop you from proposing ideas, just don't set your expectations too high, and be courteous with the people you interact with around here.

If you found a bug feel free to open an issue or submit a PR.

The core has comments that will hopefully help you navigate the code base. Single quoted strings are used everywhere except for error messages.

The tests are written using [ospec](https://github.com/MithrilJS/ospec), which has a very shallow learning curve, using two dedicated `.satisfies()` helpers (`m()` and `r()`) that should be self-documenting in context.