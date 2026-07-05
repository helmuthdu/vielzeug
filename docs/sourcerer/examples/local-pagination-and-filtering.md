---
title: 'Sourcerer Examples — Local Pagination and Filtering'
description: 'Build an in-memory paginated list with filtering and sorting using createLocalSource.'
---

## Local Pagination and Filtering

### Problem

You have an in-memory dataset you need to paginate, filter, and sort without sending requests to a server. The filtering and sort logic change at runtime based on user input, and page state must reset correctly when filters change.

### Solution

Use `createLocalSource()`. The source owns page state; `patch({ filter })` or `patch({ sort })` resets to page 1 automatically.

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
await source.patch({ filter: (p) => p.name.toLowerCase().includes('ap') });

// Sort by price ascending
await source.patch({ sort: (a, b) => a.price - b.price });

console.log(source.current);
// [{ id: 1, name: 'Apple', price: 2 }, { id: 4, name: 'Apricot', price: 4 }]
console.log(source.meta.totalItems); // 2 (only items matching the filter)
```

### Apply filter and sort atomically

Use `patch()` to apply both in one recompute — a single computation pass and a single subscriber notification:

```ts
await source.patch({
  filter: (p) => p.name.toLowerCase().includes('ap'),
  sort: (a, b) => a.price - b.price,
});
```

Calling `patch({ filter })` and `patch({ sort })` in sequence (as above) triggers two separate recomputes. Passing both fields to a single `patch()` call is the preferred approach whenever multiple query fields change together.

You can also set both as initial config if the values are known up front:

```ts
const source = createLocalSource(products, {
  limit: 2,
  filter: (p) => p.name.toLowerCase().includes('ap'),
  sort: (a, b) => a.price - b.price,
});
```

### Compose predicates

Inline composition keeps things explicit and avoids external dependencies:

```ts
await source.patch({ filter: (p) => p.name.toLowerCase().includes('a') && p.price <= 3 });
```

### Pitfalls

- Calling `patch({ filter })` and `patch({ sort })` separately triggers two recomputes and two subscriber notifications. Use `patch({ filter, sort })` instead to apply both in a single recompute with one notification.
- The default `searchFn` uses fuzzy matching. For exact substring matching in tests or precise UIs, provide a custom `searchFn`:
  ```ts
  createLocalSource(data, {
    searchFn: (items, q) => items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase())),
  });
  ```

### Related

- [Reactive Controls with Ripple](./sourcerer-with-ripple.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
