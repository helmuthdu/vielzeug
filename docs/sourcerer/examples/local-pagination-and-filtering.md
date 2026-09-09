---
title: 'Sourcerer Examples — Local Pagination and Filtering'
description: 'Filter and paginate an in-memory collection with typed params.'
---

## Local Pagination and Filtering

### Problem

You have a local collection and need page controls plus application-owned filtering.

### Solution

Pass a typed params value to the filter and replace it with `setParams()`.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type Product = { id: number; name: string; price: number };
type Params = { maximumPrice: number; search: string };
const products: Product[] = [
  { id: 1, name: 'Keyboard', price: 99 },
  { id: 2, name: 'Mouse', price: 49 },
  { id: 3, name: 'Monitor', price: 299 },
];
const source = createLocalSource<Product, Params>(products, {
  filter: (product, params) =>
    product.price <= params.maximumPrice && product.name.toLowerCase().includes(params.search.toLowerCase()),
  pageSize: 1,
  params: { maximumPrice: 200, search: '' },
});

source.setParams({ maximumPrice: 200, search: 'key' });
console.log(source.state.items); // [{ id: 1, name: 'Keyboard', price: 99 }]
source.dispose();
```

### Pitfalls

- Replace params atomically; Sourcerer does not merge objects.
- Call `setItems()` when the underlying collection changes.
- Read `state.pagination` after filtering because the page count can change.

### Related

- [Usage Guide](../usage#filter-local-collections)
- [Scout integration](../../scout/examples/sourcerer-integration)
- [Page params with URL state](./remote-search-with-url-state)
