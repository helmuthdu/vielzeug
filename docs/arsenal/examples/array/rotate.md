---
title: 'Arsenal Examples — rotate'
description: 'rotate example for @vielzeug/arsenal.'
---

## rotate

### Problem

You need to shift items in a circular buffer — moving the first item to the end, or rotating a carousel.

### Solution

Use `rotate(array, positions, options?)` to rotate left (positive) or right (negative).

```ts
import { rotate } from '@vielzeug/arsenal';

rotate([1, 2, 3, 4, 5], 2);  // [3, 4, 5, 1, 2]
rotate([1, 2, 3, 4, 5], -1); // [5, 1, 2, 3, 4]
```

### Pitfalls

- `positions` is taken modulo the array length, so rotating by `n * length` is a no-op.

### Related

- [drop](./drop.md)
- [chunk](./chunk.md)
