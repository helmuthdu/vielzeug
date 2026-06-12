---
title: 'Arsenal Examples — partition'
description: 'partition example for @vielzeug/arsenal.'
---

## partition

### Problem

You need to split an array into two groups — items that pass a predicate and items that fail — in a single pass.

### Solution

Use `partition(array, predicate)` to receive a `[pass[], fail[]]` tuple.

```ts
import { partition } from '@vielzeug/arsenal';

const [evens, odds] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
// evens: [2, 4]
// odds:  [1, 3, 5]

const [admins, users] = partition([{ role: 'admin' }, { role: 'user' }, { role: 'admin' }], (u) => u.role === 'admin');
```

### Pitfalls

- Both groups are always returned, even if empty — never `undefined`.
- Order within each group follows the original array.

### Related

- [filterMap](./select.md)
- [groupBy](./group.md)
- [compact](./compact.md)
