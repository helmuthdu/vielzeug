---
title: 'Arsenal Examples — linspace'
description: 'linspace example for @vielzeug/arsenal.'
---

## linspace

### Problem

You need an evenly-spaced sequence of numbers between two bounds — for example generating chart tick marks or interpolation samples.

### Solution

Use `linspace(start, end, steps?)` to produce an array of `steps` numbers from `start` to `end` inclusive. Default `steps` is 50.

```ts
import { linspace } from '@vielzeug/arsenal';

linspace(0, 1, 5);   // [0, 0.25, 0.5, 0.75, 1]
linspace(0, 10, 3);  // [0, 5, 10]
```

### Pitfalls

- Both `start` and `end` are always included.

### Related

- [range](./range.md)
- [lerp](./lerp.md)
