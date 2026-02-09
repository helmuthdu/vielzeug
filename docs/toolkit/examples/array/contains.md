<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-834_B-success" alt="Size">
</div>

# contains

The `contains` utility checks if a specific value exists within an array. Unlike the native `Array.prototype.includes()`, `contains` uses deep equality, making it suitable for finding objects and arrays within a list.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/contains.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Equality**: Correctly identifies objects, arrays, and nested structures.
- **Type-safe**: Properly typed for all input values.

## API

```ts
function contains<T>(array: T[], value: any): boolean;
```

### Parameters

- `array`: The array to search.
- `value`: The value to search for. Uses deep comparison for complex types.

### Returns

- `true` if the value is found in the array; otherwise, `false`.

## Examples

### Finding Primitives

```ts
import { contains } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4];
contains(numbers, 3); // true
contains(numbers, 9); // false
```

### Finding Objects (Deep Equality)

```ts
import { contains } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

// native includes() would return false here for a new object literal
contains(users, { id: 1, name: 'Alice' }); // true
```

### Finding Nested Arrays

```ts
import { contains } from '@vielzeug/toolkit';

const nested = [
  [1, 2],
  [3, 4],
];
contains(nested, [1, 2]); // true
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Uses the `isEqual` utility internally for comparisons.
- For performance-critical code with very large arrays of primitives, consider using native `includes()`.

## See Also

- [isEqual](../typed/isEqual.md): The deep equality helper used by `contains`.
- [find](./find.md): Get the matching element itself.
- [some](./some.md): Check if any element satisfies a custom predicate.
