# indexBy

The `indexBy` utility indexes an array into an object keyed by a selector function. When multiple items share the same key, the last one wins.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/indexBy.ts
:::

## Features

- **Custom selector**: Pass a function for computed keys.
- **Last-wins deduplication**: Duplicate keys overwrite earlier entries.

## API

```ts
function indexBy<T>(
  array: T[],
  selector: (item: T, index: number, array: T[]) => string | number | boolean,
): Record<string, T>;
```

### Parameters

- `array`: The array to index.
- `selector`: A function `(item: T, index: number, array: T[]) => string | number | boolean` that returns the key for each element.

### Returns

- A `Record<string, T>` mapping each key to its corresponding element.

### Throws

- `TypeError`: If the first argument is not an array.

## Examples

### Index by Selector Function

```ts
import { indexBy } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

indexBy(users, (user) => user.id);
// { '1': { id: 1, name: 'Alice' }, '2': { id: 2, name: 'Bob' }, '3': { id: 3, name: 'Charlie' } }
```

### Index with Selector Function

```ts
import { indexBy } from '@vielzeug/toolkit';

const products = [
  { sku: 'A-1', name: 'Widget', price: 9.99 },
  { sku: 'B-2', name: 'Gadget', price: 19.99 },
];

const bySku = indexBy(products, (p) => p.sku);
// { 'A-1': { sku: 'A-1', ... }, 'B-2': { sku: 'B-2', ... } }

// Fast O(1) lookup
bySku['A-1'].name; // 'Widget'
```

### Duplicate Keys (Last Wins)

```ts
import { indexBy } from '@vielzeug/toolkit';

const data = [
  { a: 'x', v: 1 },
  { a: 'y', v: 2 },
  { a: 'x', v: 3 }, // overwrites first
];

indexBy(data, (item) => item.a);
// { x: { a: 'x', v: 3 }, y: { a: 'y', v: 2 } }
```

## See Also

- [groupBy](./group.md): Group items into arrays by key.
- [filterMap](./select.md): Map and filter in one pass.
