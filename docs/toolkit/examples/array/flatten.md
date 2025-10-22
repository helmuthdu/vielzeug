# flatten

Flattens a nested array into a single-level array.

## API

```ts
flatten<T>(array: any[]): T[]
```

- `array`: The array to flatten (can be deeply nested).

### Returns

- A single-level array containing all elements from the nested array.

## Example

```ts
import { flatten } from '@vielzeug/toolkit';

const arr = [1, [2, [3, [4, [5]]]]];
flatten(arr); // [1, 2, 3, 4, 5]
flatten([[1, 2], [3, 4]]); // [1, 2, 3, 4]
```

## Notes

- Uses `Array.prototype.flat` with infinite depth.
- Useful for normalizing nested data structures.

## See also

- [chunk](./chunk.md)
