# isWithin

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-128_B-success" alt="Size">
</div>

The `isWithin` utility checks if a numeric value falls within a specified inclusive range. It is perfect for validating inputs, checking UI bounds, or coordinating logic that requires values to be between certain limits.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Inclusive Range**: Considers both the minimum and maximum values as valid (within the range).
- **Robust**: Automatically handles cases where `min` is greater than `max` by swapping them.
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
interface IsWithinFunction {
  (value: number, min: number, max: number): boolean
}
```

### Parameters

- `value`: The number to check.
- `min`: The lower bound of the range.
- `max`: The upper bound of the range.

### Returns

- `true` if the value is between `min` and `max` (inclusive); otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isWithin } from '@vielzeug/toolkit';

isWithin(5, 0, 10);  // true
isWithin(0, 0, 10);  // true
isWithin(10, 0, 10); // true
isWithin(-5, 0, 10); // false
isWithin(15, 0, 10); // false
```

## Implementation Notes

- Returns `true` if `value >= min && value <= max`.
- Swaps `min` and `max` internally if `min > max` to ensure consistent behavior.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [clamp](../math/clamp.md): Restrict a number to a specific range (returning the clamped value).
- [isNumber](./isNumber.md): Check if a value is a number.
- [isPositive](./isPositive.md): Check if a number is greater than zero.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
