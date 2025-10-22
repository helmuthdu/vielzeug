# pipe

Pipes multiple functions into a single function, applying them from left to right. Supports both sync and async functions.

## API

```ts
pipe<T extends FnDynamic[]>(...fns: T): PipeReturn<T>
```

- `...fns`: Functions to pipe, applied from left to right.
- Returns: A function that applies all piped functions in order. If any function is async, the result is a Promise.

## Example

```ts
import { pipe } from '@vielzeug/toolkit';

const add = (x) => x + 2;
const multiply = (x) => x * 3;
const subtract = (x) => x - 4;
const pipedFn = pipe(subtract, multiply, add);
pipedFn(5); // ((5-4) * 3) + 2 = 5

// Async example
const square = async (x) => x * x;
const addAsync = async (x) => x + 2;
const pipedAsync = pipe(square, addAsync);
await pipedAsync(4); // (4 * 4) + 2 = 18
```

## Notes

- Functions are applied from left to right.
- Supports both synchronous and asynchronous functions.
- Returns a Promise if any function is async.

## Related

- [compose](./compose.md)
- [fp](./fp.md)
