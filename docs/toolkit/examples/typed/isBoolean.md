<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isBoolean

The `isBoolean` utility is a type guard that checks if a given value is a boolean primitive (`true` or `false`).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isBoolean.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows types to `boolean` within conditional blocks.
- **Strict Check**: Only returns `true` for actual boolean primitives.

## API

```ts
interface IsBooleanFunction {
  (value: unknown): value is boolean;
}
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is a boolean; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isBoolean } from '@vielzeug/toolkit';

isBoolean(true); // true
isBoolean(false); // true
isBoolean(1); // false
isBoolean('true'); // false
```

### Type Guarding

```ts
import { isBoolean } from '@vielzeug/toolkit';

function process(val: unknown) {
  if (isBoolean(val)) {
    // val is narrowed to boolean
    return val ? 'Yes' : 'No';
  }
}
```

## Implementation Notes

- Returns `true` if `typeof value === 'boolean'`.
- Throws nothing; safe for any input type.

## See Also

- [isNumber](./isNumber.md): Check if a value is a number.
- [isString](./isString.md): Check if a value is a string.
- [is](./is.md): Unified type-checking engine.
