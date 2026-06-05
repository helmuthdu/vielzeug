---
title: 'Arsenal Examples — contains'
description: 'contains example for @vielzeug/arsenal.'
---

## contains

### Problem

You need to check whether an array includes a value, optionally using a selector for comparison instead of strict reference equality.

### Solution

Use `contains(array, value, selector?)` to check membership. Without a selector it uses deep equality; with a selector it compares projected keys.

```ts
import { contains } from '@vielzeug/arsenal';

contains([1, 2, 3], 2);         // true
contains([1, 2, 3], 4);         // false

const users = [{ id: 1 }, { id: 2 }];
contains(users, { id: 2 }, (u) => u.id); // true
```

### Pitfalls

- Without a selector, uses deep equality — may be slower for large objects. Use a selector for performance when comparing by key.

### Related

- [difference](./difference.md)
- [intersection](./intersection.md)
