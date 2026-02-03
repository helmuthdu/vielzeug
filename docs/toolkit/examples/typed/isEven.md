<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isEven

The `isEven` utility is a type guard that checks if a given number is an even integer.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isEven.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Strict Check**: Only returns `true` for valid numbers that are divisible by 2.
- **Type-safe**: Properly typed for numeric inputs.

## API

```ts
interface IsEvenFunction {
  (value: number): boolean
}
```

### Parameters

- `value`: The number to check.

### Returns

- `true` if the number is even; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isEven } from '@vielzeug/toolkit';

isEven(2);  // true
isEven(42); // true
isEven(3);  // false
isEven(0);  // true
```

## Implementation Notes

- Returns `true` if `value % 2 === 0`.
- Throws nothing; returns `false` for non-numeric inputs if TypeScript checks are bypassed.

## See Also

- [isOdd](./isOdd.md): Check if a number is odd.
- [isNumber](./isNumber.md): Check if a value is a number.
- [isWithin](./isWithin.md): Check if a number is within a range.