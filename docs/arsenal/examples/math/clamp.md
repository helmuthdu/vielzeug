---
title: 'Arsenal Examples — clamp'
description: 'clamp example for @vielzeug/arsenal.'
---

## clamp

### Problem

A value may fall outside a valid range and you need to pin it to the nearest boundary — for example limiting a progress bar to 0–100 or a slider to its min/max.

### Solution

Use `clamp(n, min, max)` to return `n` constrained to `[min, max]`.

```ts
import { clamp } from '@vielzeug/arsenal';

clamp(150, 0, 100); // 100
clamp(-10, 0, 100); // 0
clamp(50,  0, 100); // 50
```

### Pitfalls

- When `min > max`, returns `min`.

### Related

- [normalize](./normalize.md)
- [lerp](./lerp.md)
