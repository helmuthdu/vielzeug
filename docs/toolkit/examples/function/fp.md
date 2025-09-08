# fp

Creates a function that enables functional programming mode for compatible toolkit functions, allowing you to pass the first argument as an array and partially apply the rest.

## API

```ts
fp<T, F extends Fn = Fn>(callback: F, ...args: RemoveFirstParameter<F>): (arr: T[]) => ReturnType<F>
```

- `callback`: A toolkit function that supports functional programming mode (must have an `fp` property).
- `...args`: Arguments to partially apply to the function (excluding the array argument).
- Returns: A function that takes an array and applies the original function with the provided arguments.

## Example

```ts
import { fp } from '@vielzeug/toolkit';
import { map } from '@vielzeug/toolkit';

const double = (num: number) => num * 2;
const doubleArray = fp(map, double); // map is fp-compatible

doubleArray([1, 2, 3]); // [2, 4, 6]
```

## Notes

- Only toolkit functions marked as fp-compatible (with an `fp` property) can be used.
- Throws a `TypeError` if the function is not fp-compatible.
- Useful for creating reusable, partially applied array utilities.

## Related

- [map](../array/map.md)
- [filter](../array/filter.md)
- [reduce](../array/reduce.md)
