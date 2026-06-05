---
title: 'Arsenal Examples — gcd'
description: 'gcd example for @vielzeug/arsenal.'
---

## gcd

### Problem

You need the greatest common divisor of two integers — for example simplifying fractions or computing time intervals.

### Solution

Use `gcd(a, b)` to return the largest integer that divides both `a` and `b`.

```ts
import { gcd } from '@vielzeug/arsenal';

gcd(12, 8); // 4
gcd(7, 5);  // 1
gcd(0, 5);  // 5
```

### Related

- [lcm](./lcm.md)
