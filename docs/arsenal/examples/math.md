---
title: Arsenal — Math Examples
description: Math utility examples for Arsenal.
---

## Math Utilities

## Quick Reference

- [abs](./math/abs.md)
- [allocate](./math/allocate.md)
- [average](./math/average.md)
- [clamp](./math/clamp.md)
- [gcd](./math/gcd.md)
- [lcm](./math/lcm.md)
- [lerp](./math/lerp.md)
- [linspace](./math/linspace.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [mod](./math/mod.md)
- [normalize](./math/normalize.md)
- [percent](./math/percent.md)
- [range](./math/range.md)
- [round](./math/round.md)
- [standardDeviation](./math/standardDeviation.md)
- [sum](./math/sum.md)
- [variance](./math/variance.md)

## Common Patterns

```ts
import {
  abs,
  allocate,
  average,
  clamp,
  gcd,
  lcm,
  lerp,
  linspace,
  max,
  median,
  min,
  mod,
  normalize,
  percent,
  range,
  round,
  standardDeviation,
  sum,
  variance,
} from '@vielzeug/arsenal';

const data = [10, 2, 38, 23, 38, 8, 15];

const stats = {
  total: sum(data),
  mean: average(data),
  mid: median(data),
  low: min(data),
  high: max(data),
};

const bounded = clamp(105, 0, 100); // 100
const progress = normalize(75, 50, 100); // 0.5
const mid = lerp(10, 20, 0.5); // 15
const wrapped = mod(-1, 5); // 4
const divisor = gcd(54, 24); // 6
const multiple = lcm(6, 8); // 24
const rounded = round(Math.PI, 4); // 3.1416
const seq = range(1, 6, 1); // [1,2,3,4,5]
const pct = percent(25, 100); // 25
const ticks = linspace(0, 1, 5); // [0,0.25,0.5,0.75,1]

const weighted = allocate(100, [1, 2, 3]); // [16, 33, 51]
const equal = allocate(100, 3); // [34, 33, 33]
const spread = variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4
const stdDev = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]); // 2

const neg = abs(-42); // 42

console.log(
  stats,
  bounded,
  progress,
  mid,
  wrapped,
  divisor,
  multiple,
  rounded,
  seq,
  pct,
  ticks,
  weighted,
  equal,
  spread,
  stdDev,
  neg,
);
```
