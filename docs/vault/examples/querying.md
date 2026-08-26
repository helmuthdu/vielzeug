---
title: 'Vault Examples — Querying'
description: 'Filter, sort, paginate, and count records with the query builder in @vielzeug/vault.'
---

## Querying

### Problem

You need to filter, sort, and paginate records from a table, and you need both a page of results and the total filtered-set size for pagination controls.

### Solution

Use `db.query(table)` to build a lazy pipeline. Chain filter operators (`filter`, `equals`) and presentation operators (`orderBy`, `limit`, `offset`). Call `toArray()`, `first()`, `count()`, or `delete()` as the terminal step.

`count()` ignores `limit`, `offset`, and `orderBy` — it always returns the full filtered-set size. Use it for "page X of N" UIs without a second query.

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

// Base query — shared between the page fetch and the total count
const q = db.query('products').equals('category', 'peripherals').orderBy('price', 'asc');

// Paginated fetch
const page = await q
  .limit(pageSize)
  .offset(pageIndex * pageSize)
  .toArray();
// → [{ id: 4, ... price: 19 }, { id: 2, ... price: 49 }]

// Total filtered count — ignores limit/offset/orderBy
const total = await q.count();
// → 3 (all peripherals, regardless of pagination)

console.log(`Page ${pageIndex + 1} of ${Math.ceil(total / pageSize)}`); // Page 1 of 2

// First matching record
const cheapest = await db.query('products').orderBy('price', 'asc').first();

// Predicate filter
const expensive = await db
  .query('products')
  .filter((p) => p.price > 50)
  .toArray();

// Custom prefix match via filter()
const mice = await db
  .query('products')
  .filter((p) => p.name.toLowerCase().startsWith('mou'))
  .toArray();

// Delete via query — returns count of deleted records
const deleted = await db
  .query('products')
  .filter((p) => p.price < 25)
  .delete();

(void page, total, cheapest, expensive, mice, deleted);
```

### Pitfalls

- Query pipelines are lazy — calling `.limit(10)` does not execute anything. Only the terminal call (`toArray()`, `count()`, `first()`, `delete()`) triggers execution.
- `count()` ignores `limit`, `offset`, and `orderBy`. It always returns the full filtered-set size — use it directly for paginated total-count queries.
- `count()` still applies all filter operators (`filter`, `equals`). A bare `db.query('products').count()` returns all live records.
- For range or prefix queries, use `.filter()` with a custom predicate. `equals()` is the only built-in field-level filter.
- Queries scan the full table in memory. For large tables, prefer `iterate()` on IndexedDB or SQLite instead of materializing every record.

### Related

- [CRUD](./crud.md)
- [Lazy Iteration — IndexedDB](./iterate.md)
- [SQLite Transactions and Iteration](./sqlite.md)
- [Usage Guide — Query Records](/vault/usage.md#query-records)
- [API Reference — QueryBuilder](/vault/api.md#querybuilder)
