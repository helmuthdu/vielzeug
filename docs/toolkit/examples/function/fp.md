<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-124_B-success" alt="Size">
</div>

# fp

The `fp` utility enables "Functional Programming" mode for compatible toolkit functions. It converts a standard utility (where the array is usually the first argument) into a partially applied function where the data argument is moved to the end.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/fp.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Auto-Currying**: Pre-binds transformation logic and waits for the data.
- **Composition Friendly**: Perfect for use with `pipe`, `compose`, or native `.map()`/`.filter()` calls.
- **Type-safe**: Properly narrows types for the resulting unary function.

## API

```ts
function fp<T, R>(callback: (...args: any[]) => any, ...args: any[]): (data: T[]) => R;
```

### Parameters

- `callback`: A toolkit function that supports FP mode (most array/collection utilities).
- `...args`: The configuration arguments for the callback (excluding the data array).

### Returns

- A new function that accepts a single argument: the data array to be processed.

## Examples

### Reusable Transformations

```ts
import { fp, map, chunk } from '@vielzeug/toolkit';

// Create a reusable 'doubler' function
const doubleAll = fp(map, (n: number) => n * 2);

doubleAll([1, 2, 3]); // [2, 4, 6]
doubleAll([10, 20]); // [20, 40]
```

### Within a Pipeline

```ts
import { fp, pipe, map, filter } from '@vielzeug/toolkit';

const process = pipe(
  fp(filter, (n: number) => n > 10),
  fp(map, (n: number) => n * n),
);

process([5, 12, 8, 20]); // [144, 400]
```

## Implementation Notes

- Only functions that have been specifically prepared for FP mode will work (they must support being called with `...args` first).
- Throws `TypeError` if the `callback` is not a function.
- Performance is nearly identical to calling the original utility directly.

## See Also

- [pipe](./pipe.md): Compose multiple FP functions together.
- [curry](./curry.md): Manual currying for any custom function.
- [map](../array/map.md): The standard version of the map utility.
