---
title: 'Arsenal Examples — random'
description: 'random example for @vielzeug/arsenal.'
---

## random

### Problem

You need a random floating-point number within a specific range — for example jitter values, test data, or simulation inputs.

### Solution

Use `random(min, max)` to get a number in `[min, max]`.

```ts
import { random } from '@vielzeug/arsenal';

random(0, 1); // e.g. 0.472
random(10, 20); // e.g. 14.83
random(-5, 5); // e.g. -2.1
```

### Pitfalls

- Uses `Math.random()` — not cryptographically secure. Use `crypto.getRandomValues` for security-sensitive use cases.

### Related

- [draw](./draw.md)
- [shuffle](./shuffle.md)
