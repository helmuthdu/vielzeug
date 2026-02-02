# compare

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-112_B-success" alt="Size">
</div>

The `compare` utility is a generic comparator function that determines the relative order of two values. It returns `-1` if the first value is smaller, `1` if it is larger, and `0` if they are equal.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Handles numbers, strings, and dates.
- **Standard Interface**: Compatible with native `Array.prototype.sort()`.
- **Type-safe**: Properly typed for any comparable inputs.

## API

```ts
interface CompareFunction {
  <T>(a: T, b: T): -1 | 0 | 1
}
```

### Parameters

- `a`: The first value to compare.
- `b`: The second value to compare.

### Returns

- `-1`: `a` is less than `b`.
- `0`: `a` is equal to `b`.
- `1`: `a` is greater than `b`.

## Examples

### Basic Comparison

```ts
import { compare } from '@vielzeug/toolkit';

compare(10, 20); // -1
compare('z', 'a'); // 1
compare(5, 5); // 0
```

### Using with Native Sort

```ts
import { compare } from '@vielzeug/toolkit';

const numbers = [10, 2, 33, 4, 1];
numbers.sort(compare); // [1, 2, 4, 10, 33]
```

## Implementation Notes

- Performance-optimized for frequent use in sorting loops.
- Correctly handles `null` and `undefined` by placing them at the end (or beginning depending on direction).
- Throws nothing; safe for all basic primitive types.

## See Also

- [compareBy](./compareBy.md): Create a comparator for complex objects.
- [sort](../array/sort.md): Functional sorting helper.
- [isEqual](../typed/isEqual.md): Check for structural identity.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
