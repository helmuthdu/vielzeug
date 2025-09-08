# ➗ Math Utilities Examples

Math utilities help you perform common mathematical operations in a type-safe, ergonomic way. Use these helpers for
calculations, clamping, rounding, and more.

## 📚 Quick Reference

| Method  | Description                       |
| ------- | --------------------------------- |
| average | Calculate the average of numbers  |
| boil    | Boil down a value (custom logic)  |
| clamp   | Clamp a value between min and max |
| max     | Find the maximum value            |
| median  | Find the median value             |
| min     | Find the minimum value            |
| range   | Create a range of numbers         |
| rate    | Calculate a rate (e.g. percent)   |
| round   | Round a number to given precision |
| sum     | Sum all values in an array        |

## 🔗 Granular Examples

- [average](./math/average.md)
- [boil](./math/boil.md)
- [clamp](./math/clamp.md)
- [max](./math/max.md)
- [median](./math/median.md)
- [min](./math/min.md)
- [range](./math/range.md)
- [rate](./math/rate.md)
- [round](./math/round.md)
- [sum](./math/sum.md)

## 💡 Example Usage

```ts
import { sum, average, clamp, min, max, round } from '@vielzeug/toolkit';

const nums = [1, 2, 3, 4, 5];

// Sum all numbers
sum(nums); // 15

// Average
average(nums); // 3

// Clamp a value
clamp(10, 0, 5); // 5

// Min/Max
min(nums); // 1
max(nums); // 5

// Round to 2 decimals
round(1.2345, 2); // 1.23
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Date Utilities](./date.md)
- [Object Utilities](./object.md)
