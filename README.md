# runjs.js

![Build](https://img.shields.io/circleci/build/github/bigggge/runjs.js?token=9afeb378e355e7d8170d4f9a7675dab622dfc1a8)
![License](https://img.shields.io/github/license/bigggge/runjs.js)
[![NPM](https://img.shields.io/npm/v/runjs.js)](https://www.npmjs.com/package/runjs.js)
![Size](https://img.shields.io/bundlephobia/minzip/runjs.js)

A JavaScript Interpreter.

The only dependency is [Acorn](https://github.com/acornjs/acorn), a JavaScript-based JavaScript parser.

## Usage

```javascript
import { run } from "runjs.js";

run(`console.log("Hello World!")`);
```

## Test

```bash
npm test
```

## Support

- [x] ES5
- [ ] ES2015
  - [x] Let & Const
  - [x] For...of
  - [x] Template Literals
  - [x] Rest
  - [x] Destructuring
  - [ ] Arrow Function
  - [ ] Class
  - [ ] ES modules
- [ ] ES2016
  - [ ] Exponentiation operator
