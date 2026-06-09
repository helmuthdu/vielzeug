---
title: 'Arsenal Examples — lerp'
description: 'lerp example for @vielzeug/arsenal.'
---

## lerp

### Problem

You need to smoothly interpolate between two values — for example animating a property from start to end over time.

### Solution

Use `lerp(a, b, t)` where `t=0` returns `a`, `t=1` returns `b`, and values between interpolate linearly.

```ts
import { lerp } from '@vielzeug/arsenal';

lerp(0, 100, 0); // 0
lerp(0, 100, 0.5); // 50
lerp(0, 100, 1); // 100
lerp(0, 100, 0.25); // 25
```

### Pitfalls

- `t` is not clamped — values outside `[0, 1]` extrapolate beyond the range. Use `clamp(t, 0, 1)` if you need to restrict.

### Related

- [clamp](./clamp.md)
- [normalize](./normalize.md)
