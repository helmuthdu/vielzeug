---
title: 'Arsenal Examples — average'
description: 'average example for @vielzeug/arsenal.'
---

## average

### Problem

You need the arithmetic mean of a numeric array, optionally extracting the value from objects.

### Solution

Use `average(array, callback?)` to compute the mean.

```ts
import { average } from '@vielzeug/arsenal';

average([1, 2, 3, 4, 5]); // 3

const products = [{ price: 10 }, { price: 20 }, { price: 30 }];
average(products, (p) => p.price); // 20
```

### Pitfalls

- Returns `NaN` for an empty array.

### Related

- [sum](./sum.md)
- [median](./median.md)
