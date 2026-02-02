# flatten

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-434_B-success" alt="Size">
</div>

The `flatten` utility takes a nested array and collapses it into a single-level array. It handles any level of nesting, ensuring that all elements are brought to the top level.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Flattening**: Recursively flattens arrays of any depth.
- **Type-safe**: Properly handles type inference for the flattened result.

## API

```ts
interface FlattenFunction {
  <T>(array: any[]): T[]
}
```

### Parameters

- `array`: The array to flatten. Can contain primitives, objects, or other arrays.

### Returns

- A new, single-level array containing all non-array elements from the input.

## Examples

### Flattening Multiple Levels

```ts
import { flatten } from '@vielzeug/toolkit';

const nested = [1, [2, [3, [4, [5]]]]];
const flat = flatten(nested); 
// [1, 2, 3, 4, 5]
```

### Normalizing Data

```ts
import { flatten } from '@vielzeug/toolkit';

const matrix = [
  [1, 2],
  [3, 4],
  [5, 6]
];

flatten(matrix); 
// [1, 2, 3, 4, 5, 6]
```

## Implementation Notes

- Internally uses recursion or `Array.prototype.flat(Infinity)` where supported.
- Throws `TypeError` if the first argument is not an array.
- Empty arrays within the nesting are removed (as they contain no elements to flatten).

## See Also

- [chunk](./chunk.md): The inverse operation; split an array into chunks.
- [compact](./compact.md): Remove falsy values from an array.
- [map](./map.md): Transform elements (can be used with `flatten` for `flatMap` behavior).

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
