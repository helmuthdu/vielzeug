<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-528_B-success" alt="Size">
</div>

# isPromise

Checks if a value is a Promise.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isPromise.ts
:::

## API

```ts
function isPromise(value: unknown): value is Promise<unknown>
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a Promise, `false` otherwise

## Examples

### Basic Usage

```ts
import { isPromise } from '@vielzeug/toolkit';

isPromise(Promise.resolve(42)); // true
isPromise(42); // false
isPromise((async () => {})()); // true
```

## Implementation Notes

- Checks for the presence of a `.then` method
- Useful for type guards and async code

## See Also

- [isFunction](./isFunction.md): Check if value is a function
- [isObject](./isObject.md): Check if value is an object
- [typeOf](./typeOf.md): Get the type of any value
