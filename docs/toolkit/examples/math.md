---
title: 'Toolkit — Math Examples'
description: 'Math utility examples for Toolkit.'
---

# Math Utilities

Math utilities provide essential tools for common mathematical operations. These helpers simplify calculations, ranges, statistics, and number-safe distribution.

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

| Method                               | Description                                          |
| :----------------------------------- | :--------------------------------------------------- |
| [`abs`](./math/abs.md)               | Get the absolute value of a number.                  |
| [`allocate`](./math/allocate.md)     | Distribute a bigint amount proportionally by ratios. |
| [`average`](./math/average.md)       | Calculate the average of an array of numbers.        |
| [`clamp`](./math/clamp.md)           | Clamp a number between a minimum and maximum value.  |
| [`distribute`](./math/distribute.md) | Distribute a bigint amount evenly among N parties.   |
| [`linspace`](./math/linspace.md)     | Generate an array of evenly-spaced numbers.          |
| [`max`](./math/max.md)               | Find the maximum value in an array.                  |
| [`median`](./math/median.md)         | Find the median value in an array of numbers.        |
| [`min`](./math/min.md)               | Find the minimum value in an array.                  |
| [`percent`](./math/percent.md)       | Calculate a percentage (0–100 scale).                |
| [`range`](./math/range.md)           | Generate an array of numbers in a given range.       |
| [`round`](./math/round.md)           | Round a number to a specific decimal precision.      |
| [`sum`](./math/sum.md)               | Sum all values in an array.                          |

## 💡 Practical Examples

### Statistical Helpers

```ts
import { sum, average, median, min, max } from '@vielzeug/toolkit';

const data = [10, 2, 38, 23, 38, 8, 15];

sum(data); // 134
average(data); // ~19.14
median(data); // 15
min(data); // 2
max(data); // 38

// With optional callback — map before computing
average(users, (u) => u.age); // average age
max(users, (u) => u.score); // user with highest score
```

### Formatting & Constraints

```ts
import { clamp, round, range, percent, linspace } from '@vielzeug/toolkit';

// Clamp values (useful for UI sliders or bounds)
clamp(105, 0, 100); // 100
clamp(-5, 0, 100); // 0

// Round to precision
round(Math.PI, 4); // 3.1416

// Generate ranges
range(1, 5); // [1, 2, 3, 4, 5]
range(0, 10, 2); // [0, 2, 4, 6, 8, 10]

// Percentage calculation
percent(25, 100); // 25
percent(1, 3); // 33.333...

// Evenly spaced grid
linspace(0, 1, 5); // [0, 0.25, 0.5, 0.75, 1]
```

### Bigint Distribution

```ts
import { allocate, distribute } from '@vielzeug/toolkit';

// Distribute proportionally (e.g. money splitting)
allocate(100n, [1n, 2n, 3n]); // [17n, 33n, 50n]

// Distribute evenly (remainder goes to first buckets)
distribute(100n, 3); // [34n, 33n, 33n]
```

## 🔗 All Math Utilities

<div class="grid-links">

- [abs](./math/abs.md)
- [allocate](./math/allocate.md)
- [average](./math/average.md)
- [clamp](./math/clamp.md)
- [distribute](./math/distribute.md)
- [linspace](./math/linspace.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [percent](./math/percent.md)
- [range](./math/range.md)
- [round](./math/round.md)
- [sum](./math/sum.md)

</div>

Math utilities provide essential tools for common mathematical operations. These helpers simplify calculations, clamping, rounding, and statistical analysis.

## 📚 Quick Reference

| Method                               | Description                                         |
| :----------------------------------- | :-------------------------------------------------- |
| [`abs`](./math/abs.md)               | Get the absolute value of a number.                 |
| [`allocate`](./math/allocate.md)     | Distribute amount proportionally by ratios.         |
| [`distribute`](./math/distribute.md) | Distribute amount evenly among N parties.           |
| [`sum`](./math/sum.md)               | Sum all values in an array.                         |
| [`average`](./math/average.md)       | Calculate the average of an array of numbers.       |
| [`median`](./math/median.md)         | Find the median value in an array of numbers.       |
| [`min`](./math/min.md)               | Find the minimum value in an array.                 |
| [`max`](./math/max.md)               | Find the maximum value in an array.                 |
| [`clamp`](./math/clamp.md)           | Clamp a number between a minimum and maximum value. |
| [`round`](./math/round.md)           | Round a number to a specific decimal precision.     |
| [`range`](./math/range.md)           | Generate an array of numbers in a given range.      |
| [`linspace`](./math/linspace.md)     | Generate evenly-spaced numbers from start to end.   |
| [`percent`](./math/percent.md)       | Calculate what percentage a value is of a total.    |

## 💡 Practical Examples

### Statistical Helpers

```ts
import { sum, average, median, min, max } from '@vielzeug/toolkit';

const data = [10, 2, 38, 23, 38, 8, 15];

sum(data); // 134
average(data); // 19.14...
median(data); // 15
min(data); // 2
max(data); // 38
```

### Formatting & Constraints

```ts
import { clamp, round, range } from '@vielzeug/toolkit';

// Clamp values (useful for UI sliders or bounds)
clamp(105, 0, 100); // 100
clamp(-5, 0, 100); // 0

// Round to precision
round(Math.PI, 4); // 3.1416

// Generate ranges
range(1, 5); // [1, 2, 3, 4, 5]
range(0, 10, 2); // [0, 2, 4, 6, 8, 10]
```

## 🔗 All Math Utilities

<div class="grid-links">

- [abs](./math/abs.md)
- [allocate](./math/allocate.md)
- [average](./math/average.md)
- [clamp](./math/clamp.md)
- [distribute](./math/distribute.md)
- [linspace](./math/linspace.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [percent](./math/percent.md)
- [range](./math/range.md)
- [round](./math/round.md)
- [sum](./math/sum.md)

</div>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)
