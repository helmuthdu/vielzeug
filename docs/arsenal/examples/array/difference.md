---
title: 'Arsenal Examples — difference'
description: 'difference example for @vielzeug/arsenal.'
---

## difference

### Problem

You have two arrays and need to find items present in the first but not the second — a set-difference operation.

### Solution

Use `difference(source, other, selector?)` to return items from `source` not found in `other`.

```ts
import { difference } from '@vielzeug/arsenal';

difference([1, 2, 3, 4], [2, 4]);
// [1, 3]

const active = [{ id: 1 }, { id: 2 }, { id: 3 }];
const removed = [{ id: 2 }];
difference(active, removed, (u) => u.id);
// [{ id: 1 }, { id: 3 }]
```

### Pitfalls

- Without a selector, uses deep equality for comparison — prefer a selector for large object arrays.
- Does not deduplicate the result; if `source` has duplicates, they appear in the output.

### Related

- [intersection](./intersection.md)
- [union](./union.md)
