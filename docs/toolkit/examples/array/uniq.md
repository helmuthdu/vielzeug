# uniq

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1350_B-success" alt="Size">
</div>

The `uniq` utility creates a new array with all duplicate values removed. It supports custom selectors for complex data structures like objects.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Comparison**: Use a selector to deduplicate based on specific properties.
- **Immutable**: Returns a new array, leaving the original array unchanged.

## API

```ts
type Selector<T> = keyof T | ((item: T) => Primitive);

interface UniqFunction {
  <T>(array: T[], selector?: Selector<T>): T[]
}
```

### Parameters

- `array`: The array to process.
- `selector`: Optional. A property key or a function that returns the value used for comparison (defaults to direct element equality).

### Returns

- A new array containing only unique elements.

## Examples

### Basic Deduplication

```ts
import { uniq } from '@vielzeug/toolkit';

const numbers = [1, 2, 2, 3, 3, 3];
uniq(numbers); // [1, 2, 3]
```

### Deduplicating Objects by Property

```ts
import { uniq } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 2, name: 'Robert' }, // Duplicate ID
  { id: 3, name: 'Charlie' }
];

// Deduplicate by 'id' key
const uniqueById = uniq(users, 'id');
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Charlie' }]
```

### Deduplicating with a Selector Function

```ts
import { uniq } from '@vielzeug/toolkit';

const data = ['apple', 'Apple', 'banana', 'BANANA'];

// Deduplicate ignoring case
const uniqueCaseInsensitive = uniq(data, s => s.toLowerCase());
// ['apple', 'banana']
```

## Implementation Notes

- Throws `TypeError` if the input is not an array.
- For objects, the first encountered element for a given key is preserved.
- When no selector is provided, it uses a `Set` internally for high performance.

## See Also

- [filter](./filter.md): Create a subset of an array based on a predicate.
- [compact](./compact.md): Remove falsy values from an array.
- [aggregate](./aggregate.md): Group and aggregate array elements.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
