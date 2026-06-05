---
title: 'Arsenal Examples — intersection'
description: 'intersection example for @vielzeug/arsenal.'
---

## intersection

### Problem

You have two arrays and need items that appear in both — for example finding common tags or shared permissions.

### Solution

Use `intersection(source, other, selector?)` to return items from `source` that exist in `other`.

```ts
import { intersection } from '@vielzeug/arsenal';

intersection([1, 2, 3, 4], [2, 4, 6]);
// [2, 4]

const a = [{ id: 1 }, { id: 2 }, { id: 3 }];
const b = [{ id: 2 }, { id: 4 }];
intersection(a, b, (u) => u.id);
// [{ id: 2 }]
```

### Pitfalls

- Without a selector, uses deep equality — use a selector for objects.
- Result order follows `source`, not `other`.

### Related

- [difference](./difference.md)
- [union](./union.md)
