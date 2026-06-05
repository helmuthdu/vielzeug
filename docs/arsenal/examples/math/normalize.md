---
title: 'Arsenal Examples — normalize'
description: 'normalize example for @vielzeug/arsenal.'
---

## normalize

### Problem

You need to map a value from an arbitrary range into 0–1 — for example computing progress percentages or scaling data for a chart.

### Solution

Use `normalize(value, min, max)` to return a `[0, 1]` proportion.

```ts
import { normalize } from '@vielzeug/arsenal';

normalize(75, 0, 100); // 0.75
normalize(0,  0, 100); // 0
normalize(50, 25, 75); // 0.5
```

### Pitfalls

- When `min === max`, returns `NaN` (division by zero).
- Does not clamp output — values outside `[min, max]` produce results outside `[0, 1]`.

### Related

- [lerp](./lerp.md)
- [clamp](./clamp.md)
