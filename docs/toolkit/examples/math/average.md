# average

Calculates the arithmetic mean (average) of an array of numbers.

## API

```ts
average(numbers: number[]): number
```

- `numbers`: Array of numbers to average.
- Returns: The arithmetic mean of the numbers, or `NaN` if the array is empty.

## Example

```ts
import { average } from '@vielzeug/toolkit';

average([1, 2, 3, 4, 5]); // 3
average([]); // NaN
```

## Notes

- Returns `NaN` for an empty array.
- Ignores non-numeric values (if any).

## Related

- [sum](./sum.md)
- [median](./median.md)
