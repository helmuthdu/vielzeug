# sort

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1066_B-success" alt="Size">
</div>

The `sort` utility provides a simple, functional way to sort arrays. Unlike the native `Array.prototype.sort()`, it returns a new array and allows sorting based on a selector function with an optional descending flag.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Immutable**: Returns a new sorted array, leaving the original untouched.
- **Selector Support**: Sort by any property or computed value.
- **Custom Order**: Easily toggle between ascending and descending order.

## API

```ts
interface SortFunction {
  <T>(array: T[], selector: (item: T) => any, desc?: boolean): T[]
}
```

### Parameters

- `array`: The array to sort.
- `selector`: A function that extracts the value to compare from each element.
- `desc`: Optional. If `true`, the array is sorted in descending order (defaults to `false`).

### Returns

- A new sorted array.

## Examples

### Sorting Numbers

```ts
import { sort } from '@vielzeug/toolkit';

const numbers = [10, 2, 33, 4, 1];

// Ascending (default)
sort(numbers, n => n); // [1, 2, 4, 10, 33]

// Descending
sort(numbers, n => n, true); // [33, 10, 4, 2, 1]
```

### Sorting Objects

```ts
import { sort } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 20 },
  { name: 'Charlie', age: 30 }
];

// Sort by age
const byAge = sort(users, u => u.age);
// [{ name: 'Bob', ... }, { name: 'Alice', ... }, { name: 'Charlie', ... }]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Uses a stable sorting algorithm (where supported by the environment).
- Internally uses a generic `compare` helper to handle different data types consistently.

## See Also

- [sortBy](./sortBy.md): Sort by multiple properties with different orders.
- [compareBy](../function/compareBy.md): Create a comparator function for native sort.
- [group](./group.md): Organize elements into collections.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
