---
title: 'Arsenal Examples — union'
description: 'union example for @vielzeug/arsenal.'
---

## union

### Problem

You need to merge two arrays and deduplicate — for example combining two tag lists without duplicates.

### Solution

Use `union(source, other, selector?)` to return items from both arrays with duplicates removed.

```ts
import { union } from '@vielzeug/arsenal';

union([1, 2, 3], [2, 3, 4, 5]);
// [1, 2, 3, 4, 5]

const a = [{ id: 1 }, { id: 2 }];
const b = [{ id: 2 }, { id: 3 }];
union(a, b, (u) => u.id);
// [{ id: 1 }, { id: 2 }, { id: 3 }]
```

### Pitfalls

- Result order: `source` items first, then unique items from `other`.
- Without a selector, uses deep equality.

### Related

- [intersection](./intersection.md)
- [difference](./difference.md)
- [uniq](./uniq.md)
