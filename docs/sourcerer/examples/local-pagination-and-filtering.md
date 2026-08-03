---
title: 'Sourcerer Examples — Local Pagination and Search'
description: 'Search and paginate a prepared in-memory collection.'
---

## Local Pagination and Search

### Problem

You have a prepared local collection and need page controls plus a text search field. Filtering and ranking should remain application-owned logic.

### Solution

Prepare data before creating source. Supply an explicit `match` function for text search.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Keyboard', price: 99 },
  { id: 2, name: 'Mouse', price: 49 },
  { id: 3, name: 'Monitor', price: 299 },
];
const prepared = products.filter((product) => product.price < 200).toSorted((left, right) => left.price - right.price);
const source = createLocalSource(prepared, {
  initialQuery: { pageSize: 1 },
  match: (product, search) => product.name.toLowerCase().includes(search.toLowerCase()),
});

source.setQuery({ search: 'key' });
console.log(source.snapshot.data); // [{ id: 1, name: 'Keyboard', price: 99 }]
source.dispose();
```

### Pitfalls

- Keep dynamic filters and sort order outside `LocalQuery`; pass prepared results to `setData()`.
- Return a new array to `setData()` after changing the collection.
- Read `snapshot.pagination` after each query change; search resets to page 1.

### Related

- [Usage Guide](../usage#local-collection)
- [Scout integration](../../scout/examples/sourcerer-integration)
- [Page query with URL state](./remote-search-with-url-state)
