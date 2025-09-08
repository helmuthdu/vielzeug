# select

Selects elements from an array based on a callback function and an optional predicate function. Supports both synchronous and asynchronous callbacks.

## API

```ts
select<T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | Promise<R>, predicate?: (item: T, index: number, array: T[]) => boolean): R[]
```

- `array`: The array to select from.
- `callback`: Function to map the values (can be async).
- `predicate`: Optional function to filter the values (default: not nil).

### Returns

- A new array with the selected values.

## Example

```ts
import { select } from '@vielzeug/toolkit';

const arr = [10, 20, 30, 40];
select(arr, x => x * 2, x => x > 20); // [60, 80]
await select(arr, async x => x * 2, x => x > 20); // [60, 80]
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for mapping, filtering, or extracting subsets.

## See also

- [pick](./pick.md)
- [filter](./filter.md)
