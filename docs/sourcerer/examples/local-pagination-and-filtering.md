---
title: 'Sourcerer Examples — Local Pagination and Filtering'
description: 'Build an in-memory paginated list with filtering and sorting using createLocalSource.'
---

## Local Pagination and Filtering

### Problem

You have an in-memory dataset you need to paginate, filter, and sort — without sending requests to a server. The filtering and sort logic change at runtime based on user input, and page state must reset correctly when filters change.

### Solution

Use `createLocalSource()` with the `filterContains()` and `sortBy()` helpers. The source owns page state; calling `setFilter()` or `setSort()` resets to page 1 automatically.

```ts
import { createLocalSource, filterContains, sortBy } from '@vielzeug/sourcerer';

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Orange', price: 3 },
  { id: 4, name: 'Apricot', price: 4 },
];

const source = createLocalSource(products, { limit: 2 });

// Filter to items whose name contains 'ap' (case-insensitive)
source.setFilter(filterContains((p) => p.name, 'ap'));

// Sort by price ascending
source.setSort(sortBy((p) => p.price, 'asc'));

console.log(source.current);  // [{ id: 1, name: 'Apple', price: 2 }, { id: 4, name: 'Apricot', price: 4 }]
console.log(source.meta.totalItems);  // 2 (only items matching the filter)

source.next();  // advances to page 2 (empty — only 2 matching items)
```

To apply filter and sort together without intermediate page resets, use `batch()`:

```ts
source.batch((ctx) => {
  ctx.setFilter(filterContains((p) => p.name, 'ap'));
  ctx.setSort(sortBy((p) => p.price, 'asc'));
});
```

### Pitfalls

- `filterContains()` is case-insensitive by default. For exact matching, pass a custom predicate: `source.setFilter((p) => p.name === 'Apple')`.
- `source.current` returns a new array on each access. Cache it in a variable if you read it multiple times in the same render.
- Calling `setFilter()` and `setSort()` in separate statements triggers two page resets. Wrap both in `source.batch()` to apply them atomically.

### Related

- [Sourcerer + Ripple](./sourcerer-with-ripple.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
