<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isNegative

The `isNegative` utility is a type guard that checks if a given number is strictly less than zero.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isNegative.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Strict Check**: Only returns `true` for values $< 0$ (zero is not considered negative).
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
function isNegative(value: number): boolean
```

### Parameters

- `value`: The number to check.

### Returns

- `true` if the number is less than zero; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isNegative } from '@vielzeug/toolkit';

isNegative(-10); // true
isNegative(-0.1); // true
isNegative(0); // false
isNegative(5); // false
```

## Implementation Notes

- Returns `true` if `value < 0`.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [isPositive](./isPositive.md): Check if a number is greater than zero.
- [isZero](./isZero.md): Check if a number is exactly zero.
- [isNumber](./isNumber.md): Check if a value is a number.
