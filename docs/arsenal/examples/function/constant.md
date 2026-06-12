---
title: 'Arsenal Examples — constant'
description: 'constant example for @vielzeug/arsenal.'
---

## constant

### Problem

You need a function that always returns the same value — for example as a default callback, a stub, or a placeholder in a composition pipeline.

### Solution

Use `constant(value)` to return a zero-argument function that always returns `value`.

```ts
import { constant } from '@vielzeug/arsenal';

const alwaysTrue = constant(true);
alwaysTrue(); // true
alwaysTrue(); // true

[1, 2, 3].map(constant('x')); // ['x', 'x', 'x']
```

### Pitfalls

- The value is captured by reference for objects — all calls return the same object instance.

### Related

- [identity](./identity.md)
- [tap](./tap.md)
