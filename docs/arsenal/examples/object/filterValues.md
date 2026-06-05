---
title: 'Arsenal Examples — filterValues'
description: 'filterValues example for @vielzeug/arsenal.'
---

## filterValues

### Problem

You need to remove entries from an object where the value does not meet a condition — for example stripping null/undefined fields before sending to an API.

### Solution

Use `filterValues(obj, predicate)` to return a new object keeping only entries where the predicate returns `true`.

```ts
import { filterValues } from '@vielzeug/arsenal';

const raw = { a: 1, b: null, c: 3, d: undefined };
filterValues(raw, (v) => v != null);
// { a: 1, c: 3 }
```

### Pitfalls

- Returns a shallow copy — nested values are not cloned.

### Related

- [mapValues](./mapValues.md)
- [omit](./omit.md)
- [prune](./prune.md)
