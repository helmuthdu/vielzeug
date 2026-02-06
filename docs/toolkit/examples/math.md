# ➗ Math Utilities

Math utilities provide essential tools for common mathematical operations. These helpers simplify calculations, clamping, rounding, and statistical analysis.

## 📚 Quick Reference

| Method                             | Description                                                  |
| :--------------------------------- | :----------------------------------------------------------- |
| [`abs`](./math/abs.md)             | Get the absolute value of a number.                          |
| [`add`](./math/add.md)             | Add two numbers with precision handling.                     |
| [`subtract`](./math/subtract.md)   | Subtract one number from another.                            |
| [`multiply`](./math/multiply.md)   | Multiply a number by a scalar.                               |
| [`divide`](./math/divide.md)       | Divide a number by a divisor.                                |
| [`allocate`](./math/allocate.md)   | Distribute amount proportionally by ratios.                  |
| [`distribute`](./math/distribute.md) | Distribute amount evenly among N parties.                  |
| [`sum`](./math/sum.md)             | Sum all values in an array.                                  |
| [`average`](./math/average.md)     | Calculate the average of an array of numbers.                |
| [`median`](./math/median.md)       | Find the median value in an array of numbers.                |
| [`min`](./math/min.md)             | Find the minimum value in an array.                          |
| [`max`](./math/max.md)             | Find the maximum value in an array.                          |
| [`clamp`](./math/clamp.md)         | Clamp a number between a minimum and maximum value.          |
| [`round`](./math/round.md)         | Round a number to a specific decimal precision.              |
| [`range`](./math/range.md)         | Generate an array of numbers in a given range.               |
| [`rate`](./math/rate.md)           | Calculate a percentage or rate.                              |
| [`boil`](./math/boil.md)           | Reduce an array to a single value using a custom comparator. |

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
- [add](./math/add.md)
- [allocate](./math/allocate.md)
- [average](./math/average.md)
- [boil](./math/boil.md)
- [clamp](./math/clamp.md)
- [distribute](./math/distribute.md)
- [divide](./math/divide.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [multiply](./math/multiply.md)
- [range](./math/range.md)
- [rate](./math/rate.md)
- [round](./math/round.md)
- [subtract](./math/subtract.md)
- [sum](./math/sum.md)

</div>