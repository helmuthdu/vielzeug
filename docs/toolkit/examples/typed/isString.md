<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-406_B-success" alt="Size">
</div>

# isString

Checks if a value is a string.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isString.ts
:::

## Features

- **Type Guard**: Narrows `unknown` to `string`
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function isString(value: unknown): value is string;
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a string, `false` otherwise

## Examples

### Basic Usage

```ts
import { isString } from '@vielzeug/toolkit';

isString('foo'); // true
isString(42); // false
isString(''); // true
isString(String('hello')); // true
```

### Type Guard Usage

```ts
import { isString } from '@vielzeug/toolkit';

function process(value: unknown) {
  if (isString(value)) {
    // TypeScript knows value is string here
    return value.toUpperCase();
  }
  return 'Not a string';
}
```

## Implementation Notes

- Returns `false` for `String` objects created with `new String()`
- Use this for primitive string type checking
- Useful for validation and type narrowing in TypeScript

## See Also

- [isNumber](./isNumber.md): Check if value is a number
- [isBoolean](./isBoolean.md): Check if value is a boolean
- [isPrimitive](./isPrimitive.md): Check if value is a primitive type
- [typeOf](./typeOf.md): Get the type of any value
