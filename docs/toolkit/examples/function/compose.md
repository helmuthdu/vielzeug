# compose

Creates a function that is the composition of multiple functions, applying them from right to left.

## API

```ts
compose<T>(...fns: Array<(arg: T) => T>): (input: T) => T
```

- `...fns`: Functions to compose, applied from right to left.
- Returns: A function that applies all composed functions in order.

## Example

```ts
import { compose } from '@vielzeug/toolkit';

const double = (x: number) => x * 2;
const increment = (x: number) => x + 1;

const doubleThenIncrement = compose(increment, double);
doubleThenIncrement(3); // 7

// Async example
const square = async (x) => x * x;
const addAsync = async (x) => x + 2;
const composedAsync = compose(square, addAsync);
await composedAsync(4); // (4 * 4) + 2 = 18
```

## Notes

- Functions are applied from right to left: `compose(f, g)(x)` is `f(g(x))`.
- Useful for building complex transformations from simple functions.

## Related

- [curry](./curry.md)
- [fp](./fp.md)
