# isPositive

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

The `isPositive` utility is a type guard that checks if a given number is strictly greater than zero.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Strict Check**: Only returns `true` for values $> 0$ (zero is not considered positive).
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
interface IsPositiveFunction {
  (value: number): boolean
}
```

### Parameters

- `value`: The number to check.

### Returns

- `true` if the number is greater than zero; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isPositive } from '@vielzeug/toolkit';

isPositive(10);   // true
isPositive(0.1);  // true
isPositive(0);    // false
isPositive(-5);   // false
```

## Implementation Notes

- Returns `true` if `value > 0`.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [isNegative](./isNegative.md): Check if a number is less than zero.
- [isZero](./isZero.md): Check if a number is exactly zero.
- [isNumber](./isNumber.md): Check if a value is a number.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
