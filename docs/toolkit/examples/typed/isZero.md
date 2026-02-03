<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-48_B-success" alt="Size">
</div>

# isZero

The `isZero` utility is a type guard that checks if a given number is exactly equal to zero.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isZero.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Strict Equality**: Only returns `true` for the numeric value `0`.
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
interface IsZeroFunction {
  (value: number): boolean
}
```

### Parameters

- `value`: The number to check.

### Returns

- `true` if the number is zero; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isZero } from '@vielzeug/toolkit';

isZero(0);    // true
isZero(-0);   // true (JavaScript considers 0 and -0 equal)
isZero(1);    // false
isZero(0.1);  // false
```

## Implementation Notes

- Returns `true` if `value === 0`.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [isPositive](./isPositive.md): Check if a number is greater than zero.
- [isNegative](./isNegative.md): Check if a number is less than zero.
- [isNumber](./isNumber.md): Check if a value is a number.