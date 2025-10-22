# substitute

Replaces the first element in an array that satisfies the provided predicate function with a new value.

## API

```ts
substitute<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean, value: T): T[]
```

- `array`: The array to search.
- `predicate`: Function to test each element.
- `value`: The new value to replace the found element.

### Returns

- A new array with the replaced value (or unchanged if no match).

## Example

```ts
import { substitute } from '@vielzeug/toolkit';

const arr = [1, 2, 3];
substitute(arr, x => x === 2, 4); // [1, 4, 3]
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for updating, patching, or replacing items in arrays.

## See also

- [map](./map.md)
