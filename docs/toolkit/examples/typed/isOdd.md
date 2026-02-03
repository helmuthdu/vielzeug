<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isOdd

The `isOdd` utility is a type guard that checks if a given number is an odd integer.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isOdd.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Strict Check**: Only returns `true` for valid numbers that are not divisible by 2.
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
interface IsOddFunction {
  (value: number): boolean;
}
```

### Parameters

- `value`: The number to check.

### Returns

- `true` if the number is odd; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isOdd } from '@vielzeug/toolkit';

isOdd(3); // true
isOdd(41); // true
isOdd(2); // false
isOdd(0); // false
```

## Implementation Notes

- Returns `true` if `value % 2 !== 0`.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [isEven](./isEven.md): Check if a number is even.
- [isNumber](./isNumber.md): Check if a value is a number.
- [isWithin](./isWithin.md): Check if a number is within a range.
