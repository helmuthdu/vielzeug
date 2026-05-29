---
title: 'Deposit Examples — CRUD'
description: 'Create, read, update, and delete records with @vielzeug/deposit.'
---

## CRUD

### Problem

You need to create, read, update, and delete typed records in browser storage across one or more backends. You want TypeScript inference for record types and primary keys without manual JSON serialisation or schema management.

### Solution

Use `put`, `get`, `getAll`, `update`, `delete`, `clear`, `has`, and `count` for single-record operations. For bulk operations, use `putAll`, `getMany`, and `deleteMany`. All methods work identically across all four adapters.

```ts
import { createMemory, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };

const db = createMemory({ schema });

// write
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.putAll('users', [
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Carol', age: 28 },
]);

// read
const alice = await db.get('users', 1);         // User | undefined
const all   = await db.getAll('users');          // User[]
const count = await db.count('users');           // 3
const live  = await db.has('users', 1);          // true

// bulk read — preserves key order; missing keys yield undefined
const [a, missing, c] = await db.getMany('users', [1, 99, 3]);

// partial update — merges fields, keeps the original key
const updated = await db.update('users', 1, { age: 31 }); // User | undefined

// read-modify-write — callback receives current record or undefined
await db.upsert('users', 99, (existing) => ({
  id: 99,
  name: existing?.name ?? 'Guest',
  age: (existing?.age ?? 0) + 1,
}));

// delete
await db.delete('users', 1);                    // true if it existed
await db.deleteMany('users', [2, 3, 99]);        // count of deleted records
await db.clear('users');                         // removes all records

void alice, all, count, live, missing, a, c, updated;
```

### Pitfalls

- `update()` returns `undefined` when the key does not exist — it does not insert. Use `upsert()` for read-or-insert semantics.
- `deleteMany()` returns the count of records that actually existed and were deleted, not the length of the keys array. Keys that are not found are silently skipped.
- `count()` returns only live (non-expired) records. If you have many TTL-expired records that have not been pruned, `count()` may be lower than `getAll()` would suggest at first glance — both exclude expired records, but expired records still occupy storage until pruned.
- `putAll()` writes all records in a single atomic IDB transaction on IndexedDB. On LocalStorage and Memory adapters, each record is written individually — a failure mid-array does not roll back earlier writes.

### Related

- [Querying](./querying.md)
- [TTL and Pruning](./ttl.md)
- [Batch Writes](./batch.md)
- [Usage Guide — Basic CRUD](/deposit/usage.md#basic-crud)
