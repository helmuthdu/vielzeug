---
title: 'Arsenal Examples — sum'
description: 'sum example for @vielzeug/arsenal.'
---

## sum

### Problem

You need the total of a numeric array, optionally extracting a value from objects.

### Solution

Use `sum(array, callback?)` to compute the sum.

```ts
import { sum } from '@vielzeug/arsenal';

sum([1, 2, 3, 4, 5]); // 15

const items = [{ qty: 2, price: 5 }, { qty: 1, price: 10 }];
sum(items, (i) => i.qty * i.price); // 20
```

### Pitfalls

- Returns `0` for empty arrays.

### Related

- [average](./average.md)
- [allocate](./allocate.md)
