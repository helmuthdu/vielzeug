---
title: 'Arsenal Examples — flatten'
description: 'flatten example for @vielzeug/arsenal.'
---

## flatten

### Problem

You have a nested array and need to collapse it into a flat list, optionally controlling how many levels deep to flatten.

### Solution

Use `flatten(array, depth?)` to recursively flatten. Default depth is `1`.

```ts
import { flatten } from '@vielzeug/arsenal';

flatten([[1, 2], [3, [4, 5]]]);      // [1, 2, 3, [4, 5]]
flatten([[1, 2], [3, [4, 5]]], 2);   // [1, 2, 3, 4, 5]
flatten([[[1]], [[2]]], Infinity);    // [1, 2]
```

### Pitfalls

- `depth: 1` (default) only flattens one level. Pass `Infinity` for fully recursive flattening.
- Does not flatten non-array values — plain objects and other iterables are left as-is.

### Related

- [chunk](./chunk.md)
- [compact](./compact.md)
