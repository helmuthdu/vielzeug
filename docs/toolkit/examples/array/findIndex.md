# findIndex

Returns the index of the first element in an array that satisfies the provided predicate function.

## API

```ts
findIndex<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): number
```

- `array`: The array to search.
- `predicate`: The function to test each element.

### Returns

- The index of the first element that satisfies the predicate, or `-1` if no such element is found.

## Example

```ts
import { findIndex } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4];
findIndex(arr, (x) => x % 2 === 0); // 1
findIndex(arr, (x) => x > 4); // -1
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for locating items, conditional logic, or array manipulation.

## See also

- [find](./find.md)
- [findLast](./findLast.md)
