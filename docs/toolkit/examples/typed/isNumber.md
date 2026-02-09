<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-429_B-success" alt="Size">
</div>

# isNumber

Checks if a value is a number (excluding NaN).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isNumber.ts
:::

## Features

- **Type Guard**: Narrows `unknown` to `number`
- **NaN Exclusion**: Returns `false` for NaN values
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function isNumber(value: unknown): value is number;
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a number (and not NaN), `false` otherwise

## Examples

### Basic Usage

```ts
import { isNumber } from '@vielzeug/toolkit';

isNumber(42); // true
isNumber(3.14); // true
isNumber(NaN); // false
isNumber('42'); // false
isNumber(Infinity); // true
```

### Type Guard Usage

```ts
import { isNumber } from '@vielzeug/toolkit';

function calculate(value: unknown) {
  if (isNumber(value)) {
    // TypeScript knows value is number here
    return value * 2;
  }
  return 0;
}
```

## Implementation Notes

- Explicitly excludes `NaN` (since `typeof NaN === 'number'` in JavaScript)
- Returns `true` for `Infinity` and `-Infinity`
- Use for validation and type narrowing in TypeScript

## See Also

- [isString](./isString.md): Check if value is a string
- [isPrimitive](./isPrimitive.md): Check if value is a primitive type
- [isPositive](./isPositive.md): Check if number is positive
- [isNegative](./isNegative.md): Check if number is negative
- [typeOf](./typeOf.md): Get the type of any value
