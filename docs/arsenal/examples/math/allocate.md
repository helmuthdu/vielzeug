---
title: 'Arsenal Examples — allocate'
description: 'allocate example for @vielzeug/arsenal.'
---

## allocate

### Problem

You need to split a total amount into proportional parts — for example distributing a budget across departments or splitting a bill.

### Solution

Use `allocate(amount, ratiosOrParts)` to divide `amount` according to the given ratios. Remainders are distributed to keep the sum exact.

```ts
import { allocate } from '@vielzeug/arsenal';

allocate(100, [1, 1, 1]);     // [34, 33, 33] — sum is 100
allocate(100, [50, 25, 25]);  // [50, 25, 25]
allocate(10, [1, 2, 7]);      // [1, 2, 7]
```

### Pitfalls

- The sum of the returned array always equals `amount` — remainders are distributed left-to-right.

### Related

- [percent](./percent.md)
- [sum](./sum.md)
