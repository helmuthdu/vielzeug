<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# keyBy

The `keyBy` utility indexes an array into an object keyed by a property or selector function. When multiple items share the same key, the last one wins.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/keyBy.ts
:::

## Features

- **Property shorthand**: Pass a string key for simple property-based indexing.
- **Custom selector**: Pass a function for computed keys.
- **Last-wins deduplication**: Duplicate keys overwrite earlier entries.

## API

```ts
function keyBy<T>(array: T[], selector: Selector<T>): Record<string, T>;
```

### Parameters

- `array`: The array to index.
- `selector`: A property key string or a function `(item: T) => string | number` that returns the key for each element.

### Returns

- A `Record<string, T>` mapping each key to its corresponding element.

### Throws

- `TypeError`: If the first argument is not an array.

## Examples

### Index by Property Key

```ts
import { keyBy } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

keyBy(users, 'id');
// { '1': { id: 1, name: 'Alice' }, '2': { id: 2, name: 'Bob' }, '3': { id: 3, name: 'Charlie' } }
```

### Index with Selector Function

```ts
import { keyBy } from '@vielzeug/toolkit';

const products = [
  { sku: 'A-1', name: 'Widget', price: 9.99 },
  { sku: 'B-2', name: 'Gadget', price: 19.99 },
];

const bySku = keyBy(products, (p) => p.sku);
// { 'A-1': { sku: 'A-1', ... }, 'B-2': { sku: 'B-2', ... } }

// Fast O(1) lookup
bySku['A-1'].name; // 'Widget'
```

### Duplicate Keys (Last Wins)

```ts
import { keyBy } from '@vielzeug/toolkit';

const data = [
  { a: 'x', v: 1 },
  { a: 'y', v: 2 },
  { a: 'x', v: 3 }, // overwrites first
];

keyBy(data, 'a');
// { x: { a: 'x', v: 3 }, y: { a: 'y', v: 2 } }
```

## See Also

- [group](./group.md): Group into arrays of matching items instead of single entries.
- [select](./select.md): Filter elements by a predicate.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
