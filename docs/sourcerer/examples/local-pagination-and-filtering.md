---
title: 'Sourcerer Examples — Local Pagination and Filtering'
description: 'Build an in-memory paginated list with filtering and sorting using createLocalSource.'
---

## Local Pagination and Filtering

### Problem

You have an in-memory dataset you need to paginate, filter, and sort without sending requests to a server. The filtering and sort logic change at runtime based on user input, and page state must reset correctly when filters change.

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
await source.setFilter(filterContains((p) => p.name, 'ap'));

// Sort by price ascending
await source.setSort(sortBy((p) => p.price, 'asc'));

console.log(source.current);
// [{ id: 1, name: 'Apple', price: 2 }, { id: 4, name: 'Apricot', price: 4 }]
console.log(source.meta.totalItems); // 2 (only items matching the filter)
```

### Apply filter and sort atomically

Use `update()` to change multiple fields in a single recompute — no intermediate page resets.

```ts
await source.update({
  filter: filterContains((p) => p.name, 'ap'),
  sort: sortBy((p) => p.price, 'asc'),
});
```

### Compose predicates

```ts
import { and, filterContains, filterRange } from '@vielzeug/sourcerer';

await source.setFilter(
  and(
    filterContains((p) => p.name, 'a'),
    filterRange((p) => p.price, { max: 3 }),
  ),
);
```

### Pitfalls

- `filterContains()` is case-insensitive by default. For exact matching, pass a custom predicate: `source.setFilter((p) => p.name === 'Apple')`.
- Calling `setFilter()` and `setSort()` in separate statements triggers two independent recomputes. Use `update({ filter, sort })` to apply them atomically.
- The default `searchFn` uses fuzzy matching. For exact substring matching in tests or precise UIs, provide a custom `searchFn`:
  ```ts
  createLocalSource(data, {
    searchFn: (items, q) => items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase())),
  });
  ```

### Related

- [Reactive Controls with Ripple](./sourceit-with-stateit.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
