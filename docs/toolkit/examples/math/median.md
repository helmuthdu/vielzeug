# median

Calculates the median value of an array of numbers.

## API

```ts
median(numbers: number[]): number | undefined
```

- `numbers`: Array of numbers.
- Returns: The median value, or `undefined` if the array is empty.

## Example

```ts
import { median } from '@vielzeug/toolkit';

median([1, 2, 3, 4, 5]); // 3
median([1, 2, 3, 4]); // 2.5
median([]); // undefined
```

## Notes

- Returns `undefined` for an empty array.
- The array is not mutated.

## Related

- [average](./average.md)
- [sum](./sum.md)
