---
title: 'Vault Examples — Batch Writes'
description: 'Atomic multi-table writes and deferred observer notifications with batch() in @vielzeug/vault.'
---

## Batch Writes

### Problem

You need to write to multiple tables in a coordinated way: either as an atomic transaction (IndexedDB) where all writes succeed or none do, or as a deferred-notification group where observers fire once after all writes complete rather than once per write.

### Solution

Use `db.batch(tables, async (tx) => ...)`. Pass the tables you need in the first argument. All operations inside the callback are scoped to those tables. On IndexedDB, the entire callback runs inside a real IDB transaction. On all adapters, observer notifications are held until the callback resolves and then fired once.

#### Deferred notifications on any adapter

```ts
import { createMemory, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({ schema });

db.observe('users', (rows) => console.log('notified once with', rows.length, 'users'));

// Observers fire exactly once after both puts complete — not after each individual write
await db.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('users', { id: 2, name: 'Bob' });
});
// → "notified once with 2 users"
```

#### Atomic transaction on IndexedDB

```ts
import { createIndexedDB, table } from '@vielzeug/vault';

type User = { id: number; name: string };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

const db = createIndexedDB({ name: 'blog', schema, version: 1 });

// All three writes land atomically — or none do
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
  await tx.deleteMany('posts', [99]); // safe to delete non-existent keys
});
```

#### Rollback on error (IndexedDB)

```ts
await db.put('users', { id: 2, name: 'Bob' });

try {
  await db.batch(['users'], async (tx) => {
    await tx.delete('users', 2);
    throw new Error('abort'); // IDB transaction is rolled back
  });
} catch {}

// Bob still exists — the delete was rolled back
const bob = await db.get('users', 2);
console.log(bob?.name); // 'Bob'
```

#### `getOrDefault` inside batch

`getOrDefault` is only available inside `batch()`. It returns the existing record if found; otherwise it inserts and returns the result of `defaultFn()`. On IndexedDB the check and insert are atomic (same IDB transaction).

```ts
await db.batch(['users'], async (tx) => {
  // Returns Alice if id 1 already exists; inserts and returns Guest otherwise
  const user = await tx.getOrDefault('users', 1, () => ({ id: 1, name: 'Guest' }));
  console.log(user.name);
});
```

### Pitfalls

- `batch()` is table-scoped. Accessing a table inside the callback that was not declared in the first argument throws `VaultScopeError` at runtime and is a type error at compile time.
- On **non-IDB adapters**, if the callback throws after some writes have already executed, those writes are not rolled back — only the observer notifications are suppressed. On **IndexedDB**, the whole transaction aborts.
- Do not include long-running async work unrelated to storage inside the `batch()` callback. IDB transactions time out if no new IDB requests are made within a microtask tick. Keep the callback focused on storage operations.
- The `tables` array must not be empty. Passing an empty array throws `VaultScopeError`.

### Related

- [CRUD](./crud.md)
- [Reactive Tables](./reactive.md)
- [Usage Guide — Batch Writes](/vault/usage.md#batch-writes)
- [API Reference — TransactionContext](/vault/api.md#transactioncontext)
