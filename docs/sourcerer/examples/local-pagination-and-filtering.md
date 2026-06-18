---
title: 'Sourcerer Examples — Local Pagination and Filtering'
description: 'Build an in-memory paginated list with filtering and sorting using createLocalSource.'
---

## Local Pagination and Filtering

### Problem

You have an in-memory dataset you need to paginate, filter, and sort without sending requests to a server. The filtering and sort logic change at runtime based on user input, and page state must reset correctly when filters change.

### Solution

Use `createLocalSource()`. The source owns page state; calling `setFilter()` or `setSort()` resets to page 1 automatically.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Orange', price: 3 },
  { id: 4, name: 'Apricot', price: 4 },
];

const source = createLocalSource(products, { limit: 2 });

// Filter to items whose name contains 'ap' (case-insensitive)
await source.setFilter((p) => p.name.toLowerCase().includes('ap'));

// Sort by price ascending
await source.setSort((a, b) => a.price - b.price);

console.log(source.current);
// [{ id: 1, name: 'Apple', price: 2 }, { id: 4, name: 'Apricot', price: 4 }]
console.log(source.meta.totalItems); // 2 (only items matching the filter)
```

### Apply filter and sort without double recompute

Call `setFilter()` and `setSort()` in sequence — the second call runs after the first has already committed. For a single atomic recompute, apply both directly in the `LocalConfig` when constructing the source:

```ts
const source = createLocalSource(products, {
  limit: 2,
  filter: (p) => p.name.toLowerCase().includes('ap'),
  sort: (a, b) => a.price - b.price,
});
```

Or use the async config hook pattern with `filterAsync` if your predicates are expensive:

```ts
const source = createLocalSource(products, {
  limit: 2,
  filterAsync: async (items, signal) => items.filter((p) => p.name.toLowerCase().includes('ap')),
  sortAsync: async (items, signal) => [...items].sort((a, b) => a.price - b.price),
});
```

### Compose predicates

Inline composition keeps things explicit and avoids external dependencies:

```ts
await source.setFilter((p) => p.name.toLowerCase().includes('a') && p.price <= 3);
```

### Pitfalls

- Calling `setFilter()` and `setSort()` separately triggers two recomputes and two subscriber notifications. Use `patch({ filter, sort })` instead to apply both in a single recompute with one notification.
- The default `searchFn` uses fuzzy matching. For exact substring matching in tests or precise UIs, provide a custom `searchFn`:
  ```ts
  createLocalSource(data, {
    searchFn: (items, q) => items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase())),
  });
  ```

### Related

- [Reactive Controls with Ripple](./sourcerer-with-ripple.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
