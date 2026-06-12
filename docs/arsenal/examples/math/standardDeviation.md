---
title: 'Arsenal Examples — standardDeviation'
description: 'standardDeviation example for @vielzeug/arsenal.'
---

## standardDeviation

### Problem

You need the spread of a dataset — how far values typically deviate from the mean.

### Solution

Use `standardDeviation(array, callback?)` to compute the population standard deviation.

```ts
import { standardDeviation } from '@vielzeug/arsenal';

standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]); // 2

const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
standardDeviation(data, (d) => d.value); // ~8.165
```

### Pitfalls

- Computes population standard deviation (divide by N), not sample standard deviation (divide by N−1).
- Returns `NaN` for empty arrays.

### Related

- [variance](./variance.md)
- [average](./average.md)
