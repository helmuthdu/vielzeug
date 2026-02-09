<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-529_B-success" alt="Size">
</div>

# isFunction

Checks if a value is a function.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isFunction.ts
:::

## Features

- **Type Guard**: Narrows `unknown` to `Function`
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function isFunction(value: unknown): value is Function;
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a function, `false` otherwise

## Examples

### Basic Usage

```ts
import { isFunction } from '@vielzeug/toolkit';

isFunction(() => {}); // true
isFunction(function () {}); // true
isFunction(async () => {}); // true
isFunction(123); // false
isFunction(null); // false
```

### Type Guard Usage

```ts
import { isFunction } from '@vielzeug/toolkit';

function execute(value: unknown) {
  if (isFunction(value)) {
    // TypeScript knows value is Function here
    return value();
  }
  return null;
}
```

## Implementation Notes

- Returns `true` for all function types (regular, arrow, async, generators)
- Returns `true` for class constructors
- Useful for callback validation and type narrowing

## See Also

- [isObject](./isObject.md): Check if value is an object
- [isPromise](./isPromise.md): Check if value is a Promise
- [typeOf](./typeOf.md): Get the type of any value

## Related

- [isObject](./isObject.md)
- [isArray](./isArray.md)
