<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-184_B-success" alt="Size">
</div>

# range

The `range` utility generates an array of numbers starting from a base value up to (but not including) an end value, using a specified step increment. It is highly versatile for creating numeric sequences, loops, or lookup tables.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/range.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Bi-directional**: Easily generate both ascending and descending sequences.
- **Customizable Step**: Control the gap between numbers in the sequence.
- **Type-safe**: Properly typed for numeric inputs and array results.

## API

```ts
function range(start: number, end?: number, step?: number): number[]
```

### Parameters

- `start`: The inclusive beginning of the sequence.
- `end`: The exclusive end of the sequence.
- `step`: Optional. The amount to increment/decrement by (defaults to `1` or `-1` based on the range direction).

### Returns

- An array of numbers containing the generated sequence.

## Examples

### Basic Ascending Ranges

```ts
import { range } from '@vielzeug/toolkit';

range(0, 5); // [0, 1, 2, 3, 4]
range(1, 10, 2); // [1, 3, 5, 7, 9]
```

### Descending Ranges

```ts
import { range } from '@vielzeug/toolkit';

// Automatic step detection
range(5, 0); // [5, 4, 3, 2, 1]

// Explicit negative step
range(10, 0, -2); // [10, 8, 6, 4, 2]
```

### Advanced Usage (Loops)

```ts
import { range, map } from '@vielzeug/toolkit';

// Create 5 localized dates
const dates = map(range(0, 5), (day) => {
  const d = new Date();
  d.setDate(d.getDate() + day);
  return d;
});
```

## Implementation Notes

- Returns an empty array if `step` is `0` or if the range is logically impossible (e.g., `start < end` with a negative step).
- Performance-optimized for large sequences.
- Throws `TypeError` if non-numeric arguments are provided.

## See Also

- [list](../array/list.md): Create more complex data structures from arrays.
- [clamp](./clamp.md): Restrict a number to a specific range.
- [sum](./sum.md): Calculate the total of a generated range.
