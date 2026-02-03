<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# filter

The `filter` utility creates a new array with all elements that pass the test implemented by the provided predicate function.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/filter.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Properly infers the resulting array type.
- **Async Support**: If the predicate returns a Promise, `filter` will return a Promise that resolves to the new array once all elements are processed.

## API

```ts
interface FilterFunction {
  <T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean | Promise<boolean>): T[] | Promise<T[]>;
}
```

### Parameters

- `array`: The array to filter.
- `predicate`: The function called for every element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.

### Returns

- A new array with elements that pass the test.
- A `Promise<T[]>` if the predicate is asynchronous.

## Examples

### Basic Filtering

```ts
import { filter } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];
const evens = filter(numbers, (x) => x % 2 === 0); // [2, 4, 6]
```

### Filtering Objects

```ts
import { filter } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false },
  { id: 3, name: 'Charlie', active: true },
];

const activeUsers = filter(users, (u) => u.active);
// [{ id: 1, ... }, { id: 3, ... }]
```

### Asynchronous Filtering

```ts
import { filter, delay } from '@vielzeug/toolkit';

const ids = [1, 2, 3, 4];
const validIds = await filter(ids, async (id) => {
  await delay(100); // Simulate external validation
  return id % 2 !== 0;
}); // [1, 3]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- When using async predicates, all tests are initiated concurrently.

## See Also

- [map](./map.md): Transform elements of an array.
- [reduce](./reduce.md): Reduce an array to a single value.
- [select](./select.md): Alias for filter in some contexts.
