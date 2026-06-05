---
title: 'Arsenal Examples — variance'
description: 'variance example for @vielzeug/arsenal.'
---

## variance

### Problem

You need the variance of a dataset — the squared average deviation from the mean.

### Solution

Use `variance(array, callback?)` to compute the population variance.

```ts
import { variance } from '@vielzeug/arsenal';

variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4

const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
variance(data, (d) => d.value); // ~66.67
```

### Pitfalls

- Population variance (divide by N). Returns `NaN` for empty arrays.

### Related

- [standardDeviation](./standardDeviation.md)
- [average](./average.md)
