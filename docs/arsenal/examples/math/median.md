---
title: 'Arsenal Examples — median'
description: 'median example for @vielzeug/arsenal.'
---

## median

### Problem

You need the median (middle value) of a dataset, which is more robust to outliers than the mean.

### Solution

Use `median(array, callback?)` to return the median value.

```ts
import { median } from '@vielzeug/arsenal';

median([3, 1, 4, 1, 5]); // 3

const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
median(data, (d) => d.value); // 20
```

### Pitfalls

- For even-length arrays, returns the average of the two middle values.
- Returns `undefined` for empty arrays.

### Related

- [average](./average.md)
- [standardDeviation](./standardDeviation.md)
