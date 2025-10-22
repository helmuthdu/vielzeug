# range

Generates an array of numbers within a specified range and step.

## API

```ts
range(start: number, end: number, step?: number): number[]
```

- `start`: Start of the range (inclusive).
- `end`: End of the range (exclusive).
- `step`: Step between numbers (default: 1).
- Returns: Array of numbers from start to end (exclusive).

## Example

```ts
import { range } from '@vielzeug/toolkit';

range(0, 5); // [0, 1, 2, 3, 4]
range(1, 10, 2); // [1, 3, 5, 7, 9]
range(5, 0, -1); // [5, 4, 3, 2, 1]
```

## Notes

- Step can be negative for descending ranges.
- Returns an empty array if step is 0 or the range is invalid.

## Related

- [clamp](./clamp.md)
- [sum](./sum.md)
