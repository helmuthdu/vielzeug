---
title: 'Arsenal Examples — random'
description: 'random example for @vielzeug/arsenal.'
---

## random

### Problem

You need random integers for application behavior, or deterministic values in a test.

### Solution

Use `random(min, max)` for a cryptographically random integer in inclusive range. Pass a `RandomSource` only when deterministic behavior is required.

```ts
import { random, type RandomSource } from '@vielzeug/arsenal/random';

random(0, 1); // 0 or 1
random(10, 20); // an integer from 10 through 20
random(-5, 5); // an integer from -5 through 5

const source: RandomSource = { next: () => 0.5 };
random(1, 4, source); // 3
```

### Pitfalls

- Default source uses `crypto.getRandomValues`.
- Custom sources must return a finite number in `[0, 1)`.

### Related

- [draw](./draw.md)
- [shuffle](./shuffle.md)
