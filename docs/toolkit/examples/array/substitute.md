<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1031_B-success" alt="Size">
</div>

# substitute

The `substitute` utility replaces the first element in an array that satisfies a given predicate with a new value. It provides a clean, functional way to perform "find and replace" operations on arrays without mutating the original data.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/substitute.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Short-circuiting**: Stops searching as soon as the first match is found.
- **Immutable**: Returns a new array with the substitution applied, leaving the original unchanged.
- **Type-safe**: Ensures the replacement value matches the array element type.

## API

```ts
function substitute<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean, value: T): T[];
```

### Parameters

- `array`: The array to process.
- `predicate`: A function to test each element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.
- `value`: The new value to insert in place of the matched element.

### Returns

- A new array with the substitution performed. If no element matches the predicate, the returned array will be a shallow copy of the original.

## Examples

### Replacing Primitives

```ts
import { substitute } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4];

// Replace the value 2 with 20
substitute(numbers, (n) => n === 2, 20); // [1, 20, 3, 4]
```

### Updating Objects

```ts
import { substitute } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', status: 'pending' },
  { id: 2, name: 'Bob', status: 'pending' },
];

// Update Bob's status
const updated = substitute(users, (u) => u.id === 2, { ...users[1], status: 'active' });
/*
[
  { id: 1, name: 'Alice', ... },
  { id: 2, name: 'Bob', status: 'active' }
]
*/
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Only the **first** element that matches the predicate is replaced.
- If multiple replacements are needed, consider using [`map`](./map.md) instead.

## See Also

- [map](./map.md): Transform all elements in an array.
- [find](./find.md): Find an element without replacing it.
- [filter](./filter.md): Remove elements based on a condition.
