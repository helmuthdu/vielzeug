---
title: 'Arsenal Examples — lcm'
description: 'lcm example for @vielzeug/arsenal.'
---

## lcm

### Problem

You need the least common multiple of two integers — for example synchronizing repeating intervals.

### Solution

Use `lcm(a, b)` to return the smallest positive integer divisible by both `a` and `b`.

```ts
import { lcm } from '@vielzeug/arsenal';

lcm(4, 6); // 12
lcm(3, 5); // 15
lcm(7, 7); // 7
```

### Related

- [gcd](./gcd.md)
