# max

Returns the largest number in an array.

## API

```ts
max(numbers: number[]): number | undefined
```

- `numbers`: Array of numbers.
- Returns: The largest number, or `undefined` if the array is empty.

## Example

```ts
import { max } from '@vielzeug/toolkit';

max([1, 5, 3, 9, 2]); // 9
max([]); // undefined
```

## Notes

- Returns `undefined` for an empty array.
- Ignores non-numeric values (if any).

## Related

- [min](./min.md)
- [clamp](./clamp.md)
