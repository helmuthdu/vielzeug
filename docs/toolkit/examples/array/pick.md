# pick

Picks the first element from an array that satisfies a predicate function and applies a callback. Supports both synchronous and asynchronous callbacks.

## API

```ts
pick<T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | Promise<R>, predicate?: (item: T, index: number, array: T[]) => boolean): R | undefined
```

- `array`: The array to search.
- `callback`: Function to apply to the first matching element (can be async).
- `predicate`: Optional function to test each element (default: not nil).

### Returns

- The result of the callback for the first matching element, or `undefined` if none match.

## Example

```ts
import { pick } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4];
pick(arr, x => x * x, x => x > 2); // 9
await pick(arr, async x => x * x, x => x > 2); // 9
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for extracting, transforming, or searching for a single item.

## See also

- [select](./select.md)
