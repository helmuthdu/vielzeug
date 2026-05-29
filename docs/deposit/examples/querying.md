---
title: 'Deposit Examples — Querying'
description: 'Filter, sort, paginate, and count records with the query builder in @vielzeug/deposit.'
---

## Querying

### Problem

You need to filter, sort, and paginate records from a table, and you need both a page of results and the total filtered-set size for pagination controls.

### Solution

Use `db.query(table)` to build a lazy pipeline. Chain filter operators (`filter`, `equals`, `between`, `startsWith`) and presentation operators (`orderBy`, `limit`, `offset`). Call `toArray()`, `first()`, `count()`, `totalCount()`, or `delete()` as the terminal step.

`count()` respects `limit` and `offset` — it returns records in the current page slice. `totalCount()` ignores `limit`, `offset`, and `orderBy`, returning the full filtered-set size. Use both together for "page X of N" UIs.

```ts
import { createMemory, table } from '@vielzeug/deposit';

type Product = { id: number; name: string; price: number; category: string };
const schema = { products: table<Product>('id') };

const db = createMemory({ schema });

await db.putAll('products', [
  { id: 1, name: 'Keyboard', price: 99,  category: 'peripherals' },
  { id: 2, name: 'Mouse',    price: 49,  category: 'peripherals' },
  { id: 3, name: 'Monitor',  price: 399, category: 'displays'    },
  { id: 4, name: 'Mousepad', price: 19,  category: 'peripherals' },
]);

const pageSize  = 2;
const pageIndex = 0;

// Base query — shared between the page fetch and the total count
const q = db
  .query('products')
  .equals('category', 'peripherals')
  .orderBy('price', 'asc');

// Paginated fetch
const page = await q.limit(pageSize).offset(pageIndex * pageSize).toArray();
// → [{ id: 4, ... price: 19 }, { id: 2, ... price: 49 }]

// Total filtered count — ignores limit/offset/orderBy
const total = await q.totalCount();
// → 3 (all peripherals, regardless of pagination)

console.log(`Page ${pageIndex + 1} of ${Math.ceil(total / pageSize)}`); // Page 1 of 2

// First matching record
const cheapest = await db.query('products').orderBy('price', 'asc').first();

// Predicate filter
const expensive = await db
  .query('products')
  .filter((p) => p.price > 50)
  .toArray();

// Case-insensitive prefix match
const mice = await db
  .query('products')
  .startsWith('name', 'mou', { ignoreCase: true })
  .toArray();

// Delete via query — returns count of deleted records
const deleted = await db.query('products').filter((p) => p.price < 25).delete();

void page, total, cheapest, expensive, mice, deleted;
```

### Pitfalls

- Query pipelines are lazy — calling `.limit(10)` does not execute anything. Only the terminal call (`toArray()`, `count()`, `totalCount()`, `first()`, `delete()`) triggers execution.
- `count()` respects `limit` and `offset`. If you only want the filter count without pagination, call `totalCount()` on a pipeline without `limit`/`offset`, or call `totalCount()` on the paginated pipeline (it ignores them automatically).
- `totalCount()` still applies all filter operators (`filter`, `equals`, `between`, `startsWith`). Only presentation-only operators (`limit`, `offset`, `orderBy`) are excluded. A bare `db.query('products').totalCount()` returns all live records.
- `between(field, lower, upper)` is inclusive on both ends. For exclusive ranges, use `.filter()` with a custom predicate.
- Queries run in memory — there is no IDB index or cursor-based push-down optimisation. For very large tables, prefer `db.iterate(table)` (IndexedDB only) to stream records without materialising the full table.

### Related

- [CRUD](./crud.md)
- [Lazy Iteration — IndexedDB](./iterate.md)
- [Usage Guide — Query Data](/deposit/usage.md#query-data)
- [API Reference — QueryBuilder](/deposit/api.md#querybuilder--readquery)
