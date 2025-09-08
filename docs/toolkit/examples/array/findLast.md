# findLast

Returns the last element in an array that satisfies the provided predicate function. Optionally returns a default value if no match is found.

## API

```ts
findLast<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean, defaultValue?: T): T | undefined
```

- `array`: The array to search through.
- `predicate`: The function to test each element.
- `defaultValue`: Optional value to return if no element matches.

### Returns

- The last element that satisfies the predicate, or the default value (if provided), or `undefined`.

## Example

```ts
import { findLast } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4, 5, 6];
findLast(arr, (x) => x % 2 === 0); // 6
findLast(arr, (x) => x > 6, 0); // 0
findLast(arr, (x) => x > 6); // undefined
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for searching, filtering, or conditional logic.

## See also

- [find](./find.md)
- [findIndex](./findIndex.md)
