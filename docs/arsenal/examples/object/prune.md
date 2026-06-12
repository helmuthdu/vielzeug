---
title: 'Arsenal Examples — prune'
description: 'prune example for @vielzeug/arsenal.'
---

## prune

### Problem

You need to strip `null`, `undefined`, empty strings, and empty arrays/objects from a value before serializing or sending it to an API.

### Solution

Use `prune(value)` to recursively remove all falsy-null values, returning a clean copy.

```ts
import { prune } from '@vielzeug/arsenal';

prune({ a: 1, b: null, c: '', d: { e: undefined, f: 2 } });
// { a: 1, d: { f: 2 } }

prune([1, null, 2, undefined, 3]);
// [1, 2, 3]
```

### Pitfalls

- `false` and `0` are **kept** — `prune` only removes `null`, `undefined`, and empty strings/collections.
- Returns a deep copy — the original is not mutated.

### Related

- [filterValues](./filterValues.md)
- [compact](../array/compact.md)
