# sortBy

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-912_B-success" alt="Size">
</div>

The `sortBy` utility enables advanced multi-field sorting for arrays of objects. It allows you to specify multiple properties to sort by, each with its own independent sort direction (ascending or descending).

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Multi-Level Sorting**: Primary sort, secondary sort, etc., in a single call.
- **Declarative API**: Define sort rules using a simple configuration object.
- **Immutable**: Returns a new sorted array, leaving the original untouched.

## API

```ts
interface SortByFunction {
  <T>(
    array: T[], 
    selectors: Partial<Record<keyof T, 'asc' | 'desc'>>
  ): T[]
}
```

### Parameters

- `array`: The array of objects to sort.
- `selectors`: An object where keys are the property names and values are the sort directions (`'asc'` or `'desc'`). The order of properties in the object determines the sort priority.

### Returns

- A new sorted array.

## Examples

### Basic Multi-Field Sorting

```ts
import { sortBy } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
];

// Sort by name (asc) then age (desc)
const sorted = sortBy(users, { name: 'asc', age: 'desc' });
/*
[
  { name: 'Alice', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Bob', age: 25 }
]
*/
```

### Complex Object Sorting

```ts
import { sortBy } from '@vielzeug/toolkit';

const products = [
  { category: 'Fruit', price: 2.0 },
  { category: 'Meat', price: 5.0 },
  { category: 'Fruit', price: 1.5 },
  { category: 'Meat', price: 10.0 }
];

// Sort by category (desc) then price (asc)
sortBy(products, { category: 'desc', price: 'asc' });
/*
[
  { category: 'Meat', price: 5.0 },
  { category: 'Meat', price: 10.0 },
  { category: 'Fruit', price: 1.5 },
  { category: 'Fruit', price: 2.0 }
]
*/
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Stable sort: Elements that compare as equal will maintain their relative order.
- Internally leverages [`compareBy`](../function/compareBy.md) to generate a composite comparator.

## See Also

- [sort](./sort.md): Simple sorting by a single selector.
- [compareBy](../function/compareBy.md): Generate a comparator for use with native sort.
- [aggregate](./aggregate.md): Transform arrays into lookup maps.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
