---
title: 'Arsenal Examples — flattenPaths'
description: 'flattenPaths example for @vielzeug/arsenal.'
---

## flattenPaths

### Problem

You need to convert a nested object into a flat record of dot-notation paths — for example building search indexes or serializing form state.

### Solution

Use `flattenPaths(obj)` to produce a `Record<string, unknown>` where keys are dot-separated paths.

```ts
import { flattenPaths } from '@vielzeug/arsenal';

flattenPaths({ a: { b: { c: 1 }, d: 2 }, e: 3 });
// { 'a.b.c': 1, 'a.d': 2, 'e': 3 }
```

### Pitfalls

- Throws `RangeError` if nesting exceeds 10 levels.
- Arrays are treated as objects with numeric string keys: `{ 'items.0': 1, 'items.1': 2 }`.

### Related

- [getPath](./path.md)
- [deepMerge](./merge.md)
