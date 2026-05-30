---
title: 'Vault Examples — Reactive Tables'
description: 'Subscribe to table changes with observe, watch, observeMany, and signals in @vielzeug/vault.'
---

## Reactive Tables

### Problem

You need UI components or effects to re-run whenever a table's contents change. You want to subscribe to one or multiple tables and receive a fresh snapshot on every mutation, without polling or manual wiring.

### Solution

Use `db.observe(table, fn)` for callback-based subscriptions, `db.watch(table)` for `for await` loops, and `db.observeMany(tables, fn)` for combined multi-table snapshots. For deep integration with a reactive library, pass a `signals` map at construction time.

#### `observe` — callback subscription

```ts
import { createMemory, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({ schema });

// Fires only on future changes (default)
const stop = db.observe('users', (rows) => {
  console.log('users changed:', rows.length);
});

// Fires immediately with current state, then on every change
const stopImmediate = db.observe('users', (rows) => renderList(rows), { immediate: true });

await db.put('users', { id: 1, name: 'Alice' }); // triggers both callbacks

stop();
stopImmediate();
```

#### `watch` — async iterable stream

`watch` always starts with an immediate snapshot and then yields one snapshot per change. The observer is cleaned up automatically when the loop exits via `break`, `return`, or an unhandled throw.

```ts
for await (const users of db.watch('users')) {
  renderList(users);

  if (shouldStop) break; // unsubscribes automatically
}
```

#### `observeMany` — combined multi-table snapshot

`observeMany` fires a combined `{ [tableName]: records[] }` snapshot whenever **any** of the observed tables changes. Multiple tables changed inside a single `batch()` call coalesce into one callback.

```ts
type Post = { id: number; title: string; userId: number };
const dbSchema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

const db = createMemory({ schema: dbSchema });

const stop = db.observeMany(['users', 'posts'], ({ users, posts }) => {
  console.log(`${users.length} users, ${posts.length} posts`);
}, { immediate: true });

// Both tables change — the listener fires exactly once after the batch
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
});

stop();
```

#### `signals` plugin — zero-boilerplate reactivity

Wire a `@vielzeug/ripple` signal at construction time. Vault keeps it in sync automatically — no `observe()` call needed.

```ts
import { signal, effect } from '@vielzeug/ripple';
import { createIndexedDB, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const usersSignal = signal<User[]>([]);

const db = createIndexedDB({
  name: 'app',
  schema,
  signals: { users: usersSignal },
  version: 1,
});

effect(() => console.log('users:', usersSignal.value.length));

await db.put('users', { id: 1, name: 'Alice' }); // → effect re-runs
```

### Pitfalls

- `observe()` returns an unsubscribe function — forgetting to call it on teardown leaks listeners and keeps the table in memory. Use `watch()` for loops where cleanup needs to be automatic.
- `observeMany()` throws `VaultScopeError` when passed an empty `tables` array. Always provide at least one table name.
- Writes to multiple tables inside a single `batch()` call trigger `observeMany` exactly once, not once per dirty table. Writes outside a `batch()` trigger separate callbacks per table.
- The `signals` plugin calls `signal.update(() => snapshot)` synchronously inside the observer. If the signal triggers further writes to the same table (e.g., via a computed effect), this can cause a cycle. Structure your data flow so signals are downstream-only from storage.

### Related

- [Batch Writes](./batch.md)
- [CRUD](./crud.md)
- [Ripple](/ripple/)
- [Usage Guide — Reactive Reads](/vault/usage.md#reactive-reads)
