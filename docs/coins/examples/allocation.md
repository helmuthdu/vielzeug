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

Use decimal-string weights. `allocate` rejects empty, negative, and zero-total weights.

### Related

- [Usage Guide](../usage.md#aggregate-and-allocate)
