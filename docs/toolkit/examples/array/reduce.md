# reduce

Reduces an array to a single value using an accumulator function. Supports both synchronous and asynchronous callbacks.

## API

```ts
reduce<T, R>(array: T[], callback: (acc: R, item: T, index: number, array: T[]) => R | Promise<R>, initialValue: R): R | Promise<R>
```

- `array`: The array to reduce.
- `callback`: The accumulator function (can be async).
- `initialValue`: The initial value for the accumulator.

### Returns

- The reduced value, or a Promise that resolves to the reduced value if the callback is async.

## Example

```ts
import { reduce } from '@vielzeug/toolkit';

const arr = [1, 2, 3];
reduce(arr, (acc, curr) => acc + curr, 0); // 6
await reduce(arr, async (acc, curr) => acc + curr, 0); // 6
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for aggregation, transformation, or async workflows.

## See also

- [map](./map.md)
- [filter](./filter.md)
