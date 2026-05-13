---
title: Local Pagination and Filtering
description: Build an in-memory paginated list with filtering and sorting.
---

```ts
import { createLocalSource, filterContains, sortBy } from '@vielzeug/sourceit';

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Orange', price: 3 },
  { id: 4, name: 'Apricot', price: 4 },
];

const source = createLocalSource(products, { limit: 2 });

source.setFilter(filterContains((p) => p.name, 'ap'));
source.setSort(sortBy((p) => p.price, 'asc'));

console.log(source.current); // first page
source.next();
console.log(source.current); // second page
```
