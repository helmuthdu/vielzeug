---
title: 'Vault Examples — CRUD'
description: 'Create, read, update, and delete records with @vielzeug/vault.'
---

## CRUD

### Problem

You need to create, read, update, and delete typed records in browser storage across one or more backends. You want TypeScript inference for record types and primary keys without manual JSON serialisation or schema management.

### Solution

Use `put`, `get`, `getAll`, `update`, `delete`, `clear`, `has`, `count`, and `isEmpty` for single-record operations. For bulk operations, use `putAll`, `getMany`, and `deleteMany`. These methods are available on every Vault adapter.

```ts
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

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
const alice = await db.get('users', 1); // User | undefined
const all = await db.getAll('users'); // User[]
const count = await db.count('users'); // 3
const live = await db.has('users', 1); // true
const empty = await db.isEmpty('users'); // false — table has records

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
await db.delete('users', 1); // true if it existed
await db.deleteMany('users', [2, 3, 99]); // count of deleted records
await db.clear('users'); // removes all records

(void alice, all, count, live, empty, missing, a, c, updated);
```

### Pitfalls

- `update()` returns `undefined` when the key does not exist — it does not insert. Use `upsert()` for read-or-insert semantics.
- `deleteMany()` returns the count of records that actually existed and were deleted, not the length of the keys array. Keys that are not found are silently skipped.
- `isEmpty(table)` is a convenience shorthand for `(await count(table)) === 0` — useful for seeding default data on first run.
- `count()` and `getAll()` both return only live records. Expired records can still occupy storage until you prune them.
- `putAll()` is not an atomic unit across adapters. Use `batch()` on an IndexedDB or SQLite store when all writes must commit or roll back together.

### Related

- [Querying](./querying.md)
- [TTL and Pruning](./ttl.md)
- [Batch Writes](./batch.md)
- [Usage Guide — Read and Change Records](/vault/usage.md#read-and-change-records)
