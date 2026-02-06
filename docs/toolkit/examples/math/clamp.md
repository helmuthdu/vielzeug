<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-128_B-success" alt="Size">
</div>

# clamp

The `clamp` utility restricts a numeric value to be within a specified range. If the value is smaller than the minimum, it returns the minimum. If it's larger than the maximum, it returns the maximum. Otherwise, it returns the value itself.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/clamp.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Robust**: Gracefully handles cases where `min` is greater than `max` by swapping them.
- **Type-safe**: Properly typed for numeric inputs and results.

## API

```ts
function clamp(value: number, min: number, max: number): number
```

### Parameters

- `value`: The numeric value to restrict.
- `min`: The lower bound of the range.
- `max`: The upper bound of the range.

### Returns

- The restricted value within the `[min, max]` range.

## Examples

### Basic Clamping

```ts
import { clamp } from '@vielzeug/toolkit';

// Within range
clamp(5, 0, 10); // 5

// Below range
clamp(-5, 0, 10); // 0

// Above range
clamp(15, 0, 10); // 10
```

### Real-world Usage (UI Progress)

```ts
import { clamp } from '@vielzeug/toolkit';

function setProgress(percent: number) {
  // Ensure percent is always between 0 and 100
  const safePercent = clamp(percent, 0, 100);
  console.log(`Progress: ${safePercent}%`);
}
```

## Implementation Notes

- Performance-optimized using `Math.min` and `Math.max`.
- If `min > max`, the utility automatically swaps them to ensure consistent behavior.
- Throws `TypeError` if any of the arguments are not numbers.

## See Also

- [min](./min.md): Find the minimum value in a set.
- [max](./max.md): Find the maximum value in a set.
- [isWithin](../typed/isWithin.md): Check if a number is within a range without changing it.
