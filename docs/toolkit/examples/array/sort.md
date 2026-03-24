<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1066_B-success" alt="Size">
</div>

# sort

The `sort` utility returns a new sorted array and supports two modes:

- single-field sorting via selector function
- multi-field sorting via object selector (`{ key: 'asc' | 'desc' }`)

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/sort.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Immutable**: Returns a new sorted array, leaving the original untouched.
- **Selector Support**: Sort by any property or computed value.
- **Multi-Field Support**: Sort by multiple keys with independent directions.
- **Custom Order**: Supports `'asc'` and `'desc'`.

## API

```ts
type SortDirection = 'asc' | 'desc';
type SortSelectors<T> = Partial<Record<keyof T, SortDirection>>;

function sort<T>(array: T[], selector: (item: T) => unknown, direction?: SortDirection): T[];
function sort<T>(array: T[], selectors: SortSelectors<T>): T[];
```

### Parameters

- `array`: The array to sort.
- `selector`: A function that extracts the value to compare from each element.
- `direction`: Optional. `'asc'` by default, `'desc'` for descending order.
- `selectors`: Object-based multi-field selector. Each key maps to `'asc'` or `'desc'`.

### Returns

- A new sorted array.

## Examples

### Sorting Numbers

```ts
import { sort } from '@vielzeug/toolkit';

const numbers = [10, 2, 33, 4, 1];

// Ascending (default)
sort(numbers, (n) => n); // [1, 2, 4, 10, 33]

// Descending
sort(numbers, (n) => n, 'desc'); // [33, 10, 4, 2, 1]
```

### Sorting Objects

```ts
import { sort } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 20 },
  { name: 'Charlie', age: 30 },
];

// Sort by age
const byAge = sort(users, (u) => u.age);
// [{ name: 'Bob', ... }, { name: 'Alice', ... }, { name: 'Charlie', ... }]
```

### Sorting by Multiple Fields

```ts
import { sort } from '@vielzeug/toolkit';

const employees = [
  { team: 'A', score: 10, name: 'Chris' },
  { team: 'B', score: 12, name: 'Alex' },
  { team: 'A', score: 12, name: 'Bea' },
  { team: 'A', score: 12, name: 'Anna' },
];

const ordered = sort(employees, { score: 'desc', name: 'asc' });
// [
//   { team: 'B', score: 12, name: 'Alex' },
//   { team: 'A', score: 12, name: 'Anna' },
//   { team: 'A', score: 12, name: 'Bea' },
//   { team: 'A', score: 10, name: 'Chris' },
// ]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Uses native array sorting and returns a cloned array (`[...array]`) to keep input immutable.
- Uses `compare()` in selector mode and `compareBy()` in object-selector mode.

## See Also

- [compareBy](../function/compareBy.md): Build comparator functions for object sorting.
- [group](./group.md): Organize elements into collections.
