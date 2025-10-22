# min

Returns the smallest number in an array.

## API

```ts
min(numbers: number[]): number | undefined
```

- `numbers`: Array of numbers.
- Returns: The smallest number, or `undefined` if the array is empty.

## Example

```ts
import { min } from '@vielzeug/toolkit';

min([1, 5, 3, 9, 2]); // 1
min([]); // undefined
```

## Notes

- Returns `undefined` for an empty array.
- Ignores non-numeric values (if any).

## Related

- [max](./max.md)
- [clamp](./clamp.md)
