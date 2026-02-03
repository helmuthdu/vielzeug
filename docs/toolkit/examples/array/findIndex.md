<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1014_B-success" alt="Size">
</div>

# findIndex

The `findIndex` utility returns the index of the first element in an array that passes the provided test function. If no element matches, it returns `-1`.

## Implementation

:::details View Source Code
<<< @/../packages/toolkit/src/array/findIndex.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Short-circuiting**: Stops searching as soon as the first match is found.
- **Type-safe**: Properly typed predicate support.

## API

```ts
interface FindIndexFunction {
  <T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): number
}
```

### Parameters

- `array`: The array to search.
- `predicate`: The function to test each element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.

### Returns

- The zero-based index of the first matching element, or `-1` if no match is found.

## Examples

### Finding an Index

```ts
import { findIndex } from '@vielzeug/toolkit';

const fruits = ['apple', 'banana', 'cherry', 'date'];

// Find index of 'cherry'
findIndex(fruits, f => f === 'cherry'); // 2

// Find index of a fruit starting with 'z'
findIndex(fruits, f => f.startsWith('z')); // -1
```

### Finding Object Index

```ts
import { findIndex } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const bobIndex = findIndex(users, u => u.name === 'Bob'); // 1
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Stops iterating as soon as the predicate returns truthy.
- Does not modify the original array.

## See Also

- [find](./find.md): Get the first matching element itself.
- [findLast](./findLast.md): Get the *last* matching element.
- [search](./search.md): Find elements based on a query.