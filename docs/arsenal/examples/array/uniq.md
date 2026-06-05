---
title: 'Arsenal Examples — uniq'
description: 'uniq example for @vielzeug/arsenal.'
---

## uniq

### Problem

You need to deduplicate an array, optionally by a computed key rather than full object equality.

### Solution

Use `uniq(array, selector?)` to return a new array with duplicate values removed.

```ts
import { uniq } from '@vielzeug/arsenal';

uniq([1, 2, 2, 3, 1]);
// [1, 2, 3]

const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 1, name: 'Alice (dup)' }];
uniq(users, (u) => u.id);
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

### Pitfalls

- Without a selector, uses deep equality — use a selector for object arrays to avoid expensive deep comparisons.
- First occurrence wins when duplicates are found.

### Related

- [union](./union.md)
- [compact](./compact.md)
