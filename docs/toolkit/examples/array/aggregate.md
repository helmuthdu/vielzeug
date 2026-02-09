<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-724_B-success" alt="Size">
</div>

# aggregate

The `aggregate` utility transforms an array of objects into a single object, where each key is determined by a selector. If multiple items result in the same key, the last one processed "wins."

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/aggregate.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Flexible Keys**: Use a property string or a custom function to generate keys.
- **Efficient Transformation**: Quickly convert lists into lookup maps.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/types.ts#Selector
:::

```ts
function aggregate<T, K extends keyof T, R extends T[K] extends string ? T[K] : never>(
  array: T[],
  selector: Selector<T>,
): Record<R, T>;
```

### Parameters

- `array`: The array of objects to aggregate.
- `selector`: A property key string or a function that returns the key for each element.

### Returns

- An object with keys as generated values and values as the last matching element for each key.

## Examples

### Basic Aggregation by Property

```ts
import { aggregate } from '@vielzeug/toolkit';

const data = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
  { id: 'u1', name: 'Alice Smith' }, // Duplicate ID
];

const byId = aggregate(data, 'id');
/*
{
  u1: { id: 'u1', name: 'Alice Smith' },
  u2: { id: 'u2', name: 'Bob' }
}
*/
```

### Aggregation with a Selector Function

```ts
import { aggregate } from '@vielzeug/toolkit';

const products = [
  { sku: 'APL', price: 1.5, category: 'fruit' },
  { sku: 'BAN', price: 0.8, category: 'fruit' },
  { sku: 'CHX', price: 5.0, category: 'meat' },
];

const byCategory = aggregate(products, (p) => p.category);
/*
{
  fruit: { sku: 'BAN', price: 0.8, category: 'fruit' },
  meat: { sku: 'CHX', price: 5.0, category: 'meat' }
}
*/
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- For conflicting keys, the last item in the array is preserved.
- If you need to preserve all items for a given key, use [`group`](./group.md) instead.

## See Also

- [group](./group.md): Group array elements into lists by key.
- [uniq](./uniq.md): Remove duplicate elements from an array.
- [reduce](./reduce.md): Perform custom aggregations.
