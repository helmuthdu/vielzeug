---
title: 'Arsenal Examples — abs'
description: 'abs example for @vielzeug/arsenal.'
---

## abs

### Problem

You need the absolute value of a number in a typed utility context — for example normalising signed offsets or distances.

### Solution

Use `abs(value)` to return the non-negative magnitude.

```ts
import { abs } from '@vielzeug/arsenal';

abs(-5);  // 5
abs(3.7); // 3.7
abs(0);   // 0
```

### Pitfalls

- Equivalent to `Math.abs` — provided for consistency in functional pipelines.

### Related

- [clamp](./clamp.md)
- [mod](./mod.md)
