<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-618_B-success" alt="Size">
</div>

# compact

The `compact` utility creates a new array with all falsy values removed. This is particularly useful for cleaning up sparse arrays or removing optional values that weren't provided.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/compact.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Properly filters out `null`, `undefined`, and other falsy types from the resulting array type.
- **Immutable**: Returns a new array, leaving the original unchanged.

## API

```ts
function compact<T>(array: T[]): NonNullable<T>[]
```

### Parameters

- `array`: The array to compact.

### Returns

- A new array containing only the truthy elements from the original array.

## Examples

### Cleaning Mixed Arrays

```ts
import { compact } from '@vielzeug/toolkit';

const mixed = [0, 1, false, 2, '', 3, null, undefined, NaN, 'hello'];
const clean = compact(mixed);
// [1, 2, 3, 'hello']
```

### Sanitizing Data Structures

```ts
import { compact, map } from '@vielzeug/toolkit';

const users = [{ id: 1, name: 'Alice' }, null, { id: 2, name: 'Bob' }, undefined];

const validUsers = compact(users);
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

## Implementation Notes

- The following values are considered falsy and will be removed: `false`, `null`, `undefined`, `0`, `""` (empty string), and `NaN`.
- Throws `TypeError` if the first argument is not an array.
- For deep cleaning of nested arrays, you may need to combine this with `map` or use a recursive approach.

## See Also

- [filter](./filter.md): Filter elements based on a custom predicate.
- [uniq](./uniq.md): Remove duplicate values from an array.
- [flatten](./flatten.md): Flatten nested arrays into a single level.
