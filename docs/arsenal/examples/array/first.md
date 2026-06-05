---
title: 'Arsenal Examples — first'
description: 'first example for @vielzeug/arsenal.'
---

## first

### Problem

You need the first element of an array safely, returning a fallback instead of `undefined` when the array is empty.

### Solution

Use `first(array, fallback?)` to get the first element. Returns `fallback` (default: `undefined`) when the array is empty.

```ts
import { first } from '@vielzeug/arsenal';

first([10, 20, 30]);      // 10
first([]);                // undefined
first([], 0);             // 0
```

### Pitfalls

- Without a fallback, the return type includes `undefined`. Provide a typed fallback to narrow the return type.

### Related

- [last](./last.md)
- [take](./take.md)
