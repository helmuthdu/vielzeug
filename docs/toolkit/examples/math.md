---
title: Toolkit — Math Examples
description: Math utility examples for Toolkit.
---

# Math Utilities

## Quick Reference

- [abs](./math/abs.md)
- [allocate](./math/allocate.md)
- [average](./math/average.md)
- [clamp](./math/clamp.md)
- [linspace](./math/linspace.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [percent](./math/percent.md)
- [range](./math/range.md)
- [round](./math/round.md)
- [sum](./math/sum.md)

## Common Patterns

```ts
import {
  abs,
  allocate,
  average,
  clamp,
  linspace,
  max,
  median,
  min,
  percent,
  range,
  round,
  sum,
} from '@vielzeug/toolkit';

const data = [10, 2, 38, 23, 38, 8, 15];

const stats = {
  total: sum(data),
  mean: average(data),
  mid: median(data),
  low: min(data),
  high: max(data),
};

const bounded = clamp(105, 0, 100); // 100
const rounded = round(Math.PI, 4); // 3.1416
const seq = range(1, 6, 1); // [1,2,3,4,5]
const pct = percent(25, 100); // 25
const ticks = linspace(0, 1, 5); // [0,0.25,0.5,0.75,1]

const weighted = allocate(100, [1, 2, 3]); // [16, 33, 51]
const equal = allocate(100, 3); // [34, 33, 33]

const neg = abs(-42); // 42

console.log(stats, bounded, rounded, seq, pct, ticks, weighted, equal, neg);
```
