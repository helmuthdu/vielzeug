<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-658_B-success" alt="Size">
</div>

# isPrimitive

Checks if a value is a primitive type (string, number, boolean, null, undefined, symbol, or bigint).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isPrimitive.ts
:::

## Features

- **Comprehensive**: Checks all JavaScript primitive types
- **Type Guard**: Helps narrow types in TypeScript
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function isPrimitive(value: unknown): boolean;
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a primitive, `false` otherwise

## Examples

### Basic Usage

```ts
import { isPrimitive } from '@vielzeug/toolkit';

isPrimitive(42); // true
isPrimitive('foo'); // true
isPrimitive(true); // true
isPrimitive(null); // true
isPrimitive(undefined); // true
isPrimitive(Symbol('test')); // true
isPrimitive({}); // false
isPrimitive([]); // false
```

### Filtering Primitives

```ts
import { isPrimitive } from '@vielzeug/toolkit';

const mixed = [1, 'hello', {}, null, [], true];
const primitives = mixed.filter(isPrimitive);
// [1, 'hello', null, true]
```

## Implementation Notes

- Covers all 7 primitive types: string, number, boolean, null, undefined, symbol, bigint
- Returns `false` for objects, arrays, functions, and other reference types
- Useful for distinguishing between primitive and reference types

## See Also

- [isObject](./isObject.md): Check if value is an object
- [isArray](./isArray.md): Check if value is an array
- [isString](./isString.md): Check if value is a string
- [isNumber](./isNumber.md): Check if value is a number
- [typeOf](./typeOf.md): Get the type of any value
