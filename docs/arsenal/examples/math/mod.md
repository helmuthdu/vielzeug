---
title: 'Arsenal Examples — mod'
description: 'mod example for @vielzeug/arsenal.'
---

## mod

### Problem

You need a true mathematical modulo that always returns a non-negative result — unlike JavaScript's `%` operator, which can return negative values for negative operands.

### Solution

Use `mod(a, b)` for a non-negative modulo.

```ts
import { mod } from '@vielzeug/arsenal';

mod(7, 3); // 1
mod(-1, 7); // 6  (JS % would give -1)
mod(10, 5); // 0
```

### Pitfalls

- `%` in JavaScript is the remainder operator, not true modulo. For negative `a`, `a % b` is negative; `mod(a, b)` is always `[0, b)`.

### Related

- [abs](./abs.md)
