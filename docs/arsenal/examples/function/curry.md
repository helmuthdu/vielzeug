---
title: 'Arsenal Examples — curry'
description: 'curry example for @vielzeug/arsenal.'
---

## curry

### Problem

You need auto-curried functions — calling with fewer arguments than the arity returns a new function waiting for the rest.

### Solution

Use `curry(fn, arity?)` to wrap a function so it auto-curries. Call it one argument at a time or all at once.

```ts
import { curry } from '@vielzeug/arsenal';

const add = curry((a: number, b: number) => a + b);

add(2)(3); // 5
add(2, 3); // 5

const addTwo = add(2);
addTwo(10); // 12
```

### Pitfalls

- Provide `arity` explicitly when the function uses rest parameters, since `fn.length` would return 0.
- Curried functions are not variadic — each call collects exactly the arguments up to `arity`.

### Related

- [partial](./partial.md)
- [compose](./compose.md)
