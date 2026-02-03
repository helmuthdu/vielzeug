<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-412_B-success" alt="Size">
</div>

# isEqual

The `isEqual` utility performs a deep equality comparison between two values. It determines if two values are structurally identical, recursively checking nested objects and arrays.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isEqual.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Comparison**: Correctly handles nested structures of any depth.
- **Strict Equality**: Uses strict equality (`===`) for primitives.
- **Comprehensive Support**: Properly compares `Date`, `RegExp`, and other built-in objects.

## API

```ts
interface IsEqualFunction {
  (a: unknown, b: unknown): boolean
}
```

### Parameters

- `a`: The first value to compare.
- `b`: The second value to compare.

### Returns

- `true` if the values are deeply equal; otherwise, `false`.

## Examples

### Comparing Objects

```ts
import { isEqual } from '@vielzeug/toolkit';

const obj1 = { id: 1, meta: { tags: ['a', 'b'] } };
const obj2 = { id: 1, meta: { tags: ['a', 'b'] } };
const obj3 = { id: 1, meta: { tags: ['a', 'c'] } };

isEqual(obj1, obj2); // true
isEqual(obj1, obj3); // false
```

### Comparing Arrays

```ts
import { isEqual } from '@vielzeug/toolkit';

isEqual([1, [2, 3]], [1, [2, 3]]); // true
isEqual([1, 2], [2, 1]); // false (order matters)
```

### Specialized Types

```ts
import { isEqual } from '@vielzeug/toolkit';

const d1 = new Date('2024-01-01');
const d2 = new Date('2024-01-01');

isEqual(d1, d2); // true
isEqual(/abc/g, /abc/g); // true
```

## Implementation Notes

- Handles circular references safely.
- Performance-optimized for large objects.
- Functions are compared by reference.
- Throws nothing; safely handles all input types including `null` and `undefined`.

## See Also

- [isMatch](./isMatch.md): Check if an object matches a partial pattern.
- [contains](../array/contains.md): Search for a value in an array using deep equality.
- [diff](../object/diff.md): Calculate the difference between two objects.