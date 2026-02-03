<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1237_B-success" alt="Size">
</div>

# findLast

The `findLast` utility returns the last element in an array that passes the provided test function. Conceptually, it works like `find()` but searches backwards from the end of the array.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/findLast.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Right-to-Left Search**: Starts searching from the end of the array for better efficiency when looking for the most recent match.
- **Default Value Support**: Specify a fallback value instead of always receiving `undefined`.
- **Type-safe**: Properly infers the return type based on the array and default value.

## API

```ts
interface FindLastFunction {
  <T>(
    array: T[], 
    predicate: (item: T, index: number, array: T[]) => boolean, 
    defaultValue?: T
  ): T | undefined
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

- The last matching element, or the `defaultValue` if provided, or `undefined`.

## Examples

### Finding the Last Match

```ts
import { findLast } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];

// Find the last even number
findLast(numbers, x => x % 2 === 0); // 6
```

### Using a Default Value

```ts
import { findLast } from '@vielzeug/toolkit';

const logs = [
  { level: 'info', message: 'Startup' },
  { level: 'warn', message: 'High memory' },
  { level: 'info', message: 'Processing' }
];

// Find the last error with fallback
const lastError = findLast(logs, l => l.level === 'error', { level: 'none', message: 'No errors' });
// { level: 'none', message: 'No errors' }
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Stops searching as soon as the first match (from the right) is found.
- Does not modify the original array.

## See Also

- [find](./find.md): Get the *first* matching element.
- [findIndex](./findIndex.md): Get the index of the first matching element.
- [filter](./filter.md): Get *all* matching elements.