---
title: Coins Examples — Allocation
description: Split exact money without losing minor units.
---

## Allocate Money

### Problem

Split a monetary value while preserving every minor unit.

### Solution

```ts
import { USD, allocate, money, sum, toDecimal } from '@vielzeug/coins';

const total = money('10.00', USD);
const shares = allocate(total, ['1', '2', '1']);

console.log(shares.map(toDecimal));
console.log(toDecimal(sum(shares)));
```

### Pitfalls

Use a dense array of decimal-string weights. `allocate()` rejects empty, sparse, negative, and zero-total weights, and limits output to 100,000 parts. Remainders go to the largest fractional shares, with input order breaking ties; negative totals use the same distribution with negative signs.

### Related

- [Usage Guide](../usage.md#aggregate-and-allocate)
