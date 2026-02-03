<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-148_B-success" alt="Size">
</div>

# compareBy

The `compareBy` utility is a factory function that creates a comparator based on a selector function. It is ideal for sorting arrays of objects by a specific property or a computed value.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/compareBy.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Integrated Comparison**: Uses the `compare` utility internally for reliable ordering.
- **Standard Interface**: Returns a comparator compatible with native `Array.prototype.sort()`.
- **Type-safe**: Properly typed for objects and their selected properties.

## API

```ts
interface CompareByFunction {
  <T>(selector: (item: T) => any): (a: T, b: T) => -1 | 0 | 1
}
```

### Parameters

- `selector`: A function that receives an item and returns the value to be used for comparison.

### Returns

- A comparator function that takes two items (`a`, `b`) and returns `-1`, `0`, or `1`.

## Examples

### Sorting Objects by Property

```ts
import { compareBy } from '@vielzeug/toolkit';

const users = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
];

// Create a comparator for the 'age' property
const byAge = compareBy(u => u.age);

users.sort(byAge); 
// Results in: Bob (25), Alice (30), Charlie (35)
```

### Sorting with Computed Values

```ts
import { compareBy } from '@vielzeug/toolkit';

const files = ['data.json', 'report.pdf', 'README.md'];

// Sort by extension length
const byExtLength = compareBy(f => f.split('.').pop()?.length || 0);

files.sort(byExtLength);
```

## Implementation Notes

- Performance-optimized factory that pre-binds the selector.
- Internally leverages `compare` to handle the logic for primitives.
- Throws `TypeError` if `selector` is not a function.

## See Also

- [compare](./compare.md): The underlying primitive comparison logic.
- [sort](../array/sort.md): Functional sorting using a selector directly.
- [sortBy](../array/sortBy.md): Sort by multiple fields.