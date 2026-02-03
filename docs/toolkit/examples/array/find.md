<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1137_B-success" alt="Size">
</div>

# find

The `find` utility returns the first element in an array that passes the provided test function. It also supports an optional default value to be returned if no match is found, providing a more ergonomic alternative to the native `Array.prototype.find()`.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/find.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Short-circuiting**: Stops searching as soon as the first match is found.
- **Default Value Support**: Specify a fallback value instead of always receiving `undefined`.
- **Type-safe**: Properly infers the return type based on the array and default value.

## API

```ts
interface FindFunction {
  <T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean, defaultValue?: T): T | undefined;
}
```

### Parameters

- `array`: The array to search.
- `predicate`: The function to test each element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.
- `defaultValue`: Optional. A value to return if no elements match the predicate.

### Returns

- The first matching element, or the `defaultValue` if provided, or `undefined`.

## Examples

### Basic Searching

```ts
import { find } from '@vielzeug/toolkit';

const numbers = [1, 3, 4, 7, 8];

// Find the first even number
find(numbers, (x) => x % 2 === 0); // 4
```

### Using a Default Value

```ts
import { find } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

// Find user by ID with fallback
const user = find(users, (u) => u.id === 99, { id: 0, name: 'Guest' });
// { id: 0, name: 'Guest' }
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Stops iterating as soon as the predicate returns truthy.
- Does not modify the original array.

## See Also

- [findIndex](./findIndex.md): Get the index of the first matching element.
- [findLast](./findLast.md): Get the _last_ matching element.
- [filter](./filter.md): Get _all_ matching elements.
- [some](./some.md): Check if _any_ match exists.
