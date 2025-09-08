# contains

Checks if a value is present in an array using deep equality.

## API

```ts
contains<T>(array: T[], value: any): boolean
```

- `array`: The array to check.
- `value`: The value to search for (deep equality).

### Returns

- `true` if the value is present in the array, otherwise `false`.

## Example

```ts
import { contains } from '@vielzeug/toolkit';

const arr = [1, 2, 3, { a: 1 }, 'hello'];
contains(arr, 2); // true
contains(arr, { a: 1 }); // true
contains(arr, { a: 2 }); // false
```

## Notes

- Uses deep equality for objects and arrays.
- Throws `TypeError` if the first argument is not an array.
- Useful for searching arrays of primitives or objects.

## See also

- [find](./find.md)
