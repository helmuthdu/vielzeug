---
title: 'Arsenal Examples — min'
description: 'min example for @vielzeug/arsenal.'
---

## min

### Problem

You need the minimum value in an array, optionally extracting a numeric field from objects.

### Solution

Use `min(array, callback?)` to return the smallest value.

```ts
import { min } from '@vielzeug/arsenal';

min([3, 1, 4, 1, 5]); // 1

const prices = [{ price: 30 }, { price: 10 }, { price: 20 }];
min(prices, (p) => p.price); // 10
```

### Pitfalls

- Returns `undefined` for empty arrays.

### Related

- [max](./max.md)
- [clamp](./clamp.md)
