---
title: 'Arsenal Examples — round'
description: 'round example for @vielzeug/arsenal.'
---

## round

### Problem

You need to round a number to a specific decimal precision — avoiding the floating-point inaccuracies of naive `Math.round`.

### Solution

Use `round(value, precision?, parser?)` to round to `precision` decimal places.

```ts
import { round } from '@vielzeug/arsenal';

round(3.14159, 2); // 3.14
round(3.14159, 0); // 3
round(1.005, 2); // 1.01
```

### Pitfalls

- Default precision is `0` (rounds to nearest integer).
- Floating-point representation means some values behave unexpectedly — `round` uses the standard multiply-round-divide approach which handles most common cases correctly.

### Related

- [clamp](./clamp.md)
- [percent](./percent.md)
