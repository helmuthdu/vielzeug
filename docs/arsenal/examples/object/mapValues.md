---
title: 'Arsenal Examples — mapValues'
description: 'mapValues example for @vielzeug/arsenal.'
---

## mapValues

### Problem

You need to transform every value in an object while keeping the same keys — for example rounding all numeric fields or formatting display values.

### Solution

Use `mapValues(obj, mapper)` to produce a new object with the same keys and transformed values.

```ts
import { mapValues } from '@vielzeug/arsenal';

const prices = { apple: 1.234, banana: 0.567, cherry: 2.891 };
mapValues(prices, (v) => Math.round(v * 100) / 100);
// { apple: 1.23, banana: 0.57, cherry: 2.89 }
```

### Pitfalls

- Returns a new object — the original is not mutated.

### Related

- [mapKeys](./mapKeys.md)
- [filterValues](./filterValues.md)
