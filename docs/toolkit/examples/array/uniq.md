# uniq

Creates a new array with duplicate values removed. Supports custom selectors for objects.

## API

```ts
uniq<T>(array: T[], selector?: string | ((item: T) => Primitive)): T[]
```

- `array`: The array to process.
- `selector`: Optional key or function to compare objects (default: direct equality).

### Returns

- A new duplicate-free array.

## Example

```ts
import { uniq } from '@vielzeug/toolkit';

uniq([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
const arrObj = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }, { id: 3 }, { id: 3 }];
uniq(arrObj, 'id'); // [{ id: 1 }, { id: 2 }, { id: 3 }]
uniq(arrObj, item => item.id); // [{ id: 1 }, { id: 2 }, { id: 3 }]
```

## Notes

- Throws `TypeError` if the input is not an array or selector is invalid.
- Useful for deduplication, normalization, or cleaning data.

## See also

- [filter](./filter.md)
