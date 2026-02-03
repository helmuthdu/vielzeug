<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-284_B-success" alt="Size">
</div>

# pipe

The `pipe` utility performs functional composition from left to right. It takes multiple functions and returns a single function that passes its result from one call to the next, creating a processing pipeline.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/pipe.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Async Support**: Automatically handles Promises. If any function in the pipe returns a Promise, the final result will be a Promise.
- **Type-safe**: Properly infers input and output types through the entire pipeline.
- **Left-to-Right**: Executes functions in the order they are provided.

## API

```ts
interface PipeFunction {
  <T extends any[], R>(
    ...fns: [(...args: T) => any, ...Array<(arg: any) => any>, (arg: any) => R]
  ): (...args: T) => R | Promise<R>;
}
```

### Parameters

- `...fns`: A sequence of functions to be composed.

### Returns

- A new function that represents the pipeline.

## Examples

### Synchronous Pipeline

```ts
import { pipe } from '@vielzeug/toolkit';

const trim = (s: string) => s.trim();
const capitalize = (s: string) => s.toUpperCase();
const exclaim = (s: string) => `${s}!`;

const process = pipe(trim, capitalize, exclaim);

process('  hello  '); // 'HELLO!'
```

### Asynchronous Pipeline

```ts
import { pipe, delay } from '@vielzeug/toolkit';

const fetchUser = async (id: number) => {
  await delay(10);
  return { id, name: 'Alice' };
};

const getDisplayName = (user: { name: string }) => user.name;

const getUserName = pipe(fetchUser, getDisplayName);

await getUserName(1); // 'Alice'
```

## Implementation Notes

- If only one function is provided, it is returned as-is.
- Uses `reduce` internally to chain function calls.
- Throws `TypeError` if any provided argument is not a function.

## See Also

- [compose](./compose.md): Functional composition from right to left.
- [fp](./fp.md): Wrap functions for better functional programming support.
- [map](../array/map.md): Use `pipe` within a map for complex transformations.
