# find

Returns the first element in an array that satisfies the provided predicate function. Optionally returns a default value if no match is found.

## API

```ts
find<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean, defaultValue?: T): T | undefined
```

- `array`: The array to search through.
- `predicate`: The function to test each element.
- `defaultValue`: Optional value to return if no element matches.

### Returns

- The first element that satisfies the predicate, or the default value (if provided), or `undefined`.

## Example

```ts
import { find } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4];
find(arr, (x) => x % 2 === 0); // 2
find(arr, (x) => x > 4, 0); // 0
find(arr, (x) => x > 4); // undefined
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for searching, filtering, or conditional logic.

## See also

- [findIndex](./findIndex.md)
- [filter](./filter.md)
