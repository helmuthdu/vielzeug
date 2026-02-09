<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-553_B-success" alt="Size">
</div>

# isObject

Checks if a value is a plain object.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isObject.ts
:::

## Features

- **Type Guard**: Narrows `unknown` to `object`
- **Plain Object Detection**: Excludes arrays, functions, and null
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function isObject(value: unknown): value is object;
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a plain object, `false` otherwise

## Examples

### Basic Usage

```ts
import { isObject } from '@vielzeug/toolkit';

isObject({}); // true
isObject({ name: 'Alice' }); // true
isObject([]); // false
isObject(null); // false
isObject(new Date()); // true
```

### Type Guard Usage

```ts
import { isObject } from '@vielzeug/toolkit';

function process(value: unknown) {
  if (isObject(value)) {
    // TypeScript knows value is object here
    return Object.keys(value);
  }
  return [];
}
```

## Implementation Notes

- Returns `false` for arrays (use `isArray` for arrays)
- Returns `false` for functions (use `isFunction` for functions)
- Returns `false` for `null` (common JavaScript gotcha)
- Returns `true` for class instances and built-in objects like `Date`, `RegExp`

## See Also

- [isArray](./isArray.md): Check if value is an array
- [isFunction](./isFunction.md): Check if value is a function
- [isPrimitive](./isPrimitive.md): Check if value is a primitive type
- [typeOf](./typeOf.md): Get the type of any value
