# filter

Filters an array based on a predicate function.

## API

```ts
filter<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): T[]
```

- `array`: The array to filter.
- `predicate`: The function to test each element.

### Returns

- A new array with elements that pass the predicate test.

## Example

```ts
import { filter } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4];
filter(arr, (x) => x % 2 === 0); // [2, 4]
filter([1, 2, 3, 4, 5], (num) => num > 2); // [3, 4, 5]
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for extracting subsets, cleaning data, or conditional logic.

## See also

- [map](./map.md)
- [reduce](./reduce.md)
