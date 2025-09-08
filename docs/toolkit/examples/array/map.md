# map

Transforms an array by applying a callback function to each of its elements. Supports both synchronous and asynchronous callbacks.

## API

```ts
map<T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | Promise<R>): R[] | Promise<R[]>
```

- `array`: The array to transform.
- `callback`: The function to invoke for each element (can be async).

### Returns

- A new array with transformed elements, or a Promise resolving to the array if the callback is async.

## Example

```ts
import { map } from '@vielzeug/toolkit';

const arr = [1, 2, 3];
map(arr, x => x * 2); // [2, 4, 6]
await map(arr, async x => x * 2); // [2, 4, 6]
```

## Notes

- Throws `TypeError` if the input is not an array.
- If the callback is async, returns a Promise.
- Useful for transforming, mapping, or processing data.

## See also

- [filter](./filter.md)
- [reduce](./reduce.md)
