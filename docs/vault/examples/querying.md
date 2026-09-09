---
title: 'Vault Examples — Filtering'
description: 'Filter, sort, and paginate records with getAll and derived helpers in @vielzeug/vault.'
---

## Filtering

### Problem

You need to filter, sort, and paginate records from a table, and you need both a page of results and the total filtered-set size for pagination controls.

### Solution

Use the bound fluent `query()` API for typed filtering, ordering, pagination, counting, and deletion. Queries compose over `getAll()`; for large document stores, use `iterate()` or IndexedDB's `getAllByIndex()`.

```ts
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

type Product = { id: number; name: string; price: number; category: string };
const schema = { products: table<Product>('id') };

const db = createMemory({ schema });

await db.putAll('products', [
  { id: 1, name: 'Keyboard', price: 99, category: 'peripherals' },
  { id: 2, name: 'Mouse', price: 49, category: 'peripherals' },
  { id: 3, name: 'Monitor', price: 399, category: 'displays' },
  { id: 4, name: 'Mousepad', price: 19, category: 'peripherals' },
]);

const pageSize = 2;
const pageIndex = 0;
const peripherals = db.query('products').equals('category', 'peripherals').orderBy('price');

const page = await peripherals.offset(pageIndex * pageSize).limit(pageSize).toArray();
const total = await peripherals.count();
const cheapest = await db.query('products').orderBy('price').first();
const expensive = await db.query('products').filter((product) => product.price > 50).toArray();
const mice = await db
  .query('products')
  .filter((product) => product.name.toLowerCase().startsWith('mou'))
  .toArray();
const deleted = await db.query('products').filter((product) => product.price < 25).delete();

console.log(`Page ${pageIndex + 1} of ${Math.ceil(total / pageSize)}`);
console.log(await db.count('products'));

(void page, cheapest, expensive, mice, deleted);
```

### Pitfalls

- `query()` composes over `getAll()` and materializes the table. For large tables, prefer `iterate()` or IndexedDB's `getAllByIndex()`.
- `deleteMany()` returns the count of records that actually existed and were deleted, not the length of the keys array.
- `count()` and `getAll()` both return only live records. Expired records can still occupy storage until you prune them.

### Related

- [CRUD](./crud.md)
- [Lazy Iteration — IndexedDB](./iterate.md)
- [SQLite Transactions and Iteration](./sqlite.md)
- [Usage Guide — Iterate and Filter Records](/vault/usage.md#iterate-and-filter-records)
- [API Reference — Derived Helpers](/vault/api.md#derived-helpers)
