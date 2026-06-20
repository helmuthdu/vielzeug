---
title: 'Vault Examples — Reactive Tables'
description: 'Subscribe to table changes with observe, watch, observeMany, and signals in @vielzeug/vault.'
---

## Reactive Tables

### Problem

You need UI components or effects to re-run whenever a table's contents change. You want to subscribe to one or multiple tables and receive a fresh snapshot on every mutation, without polling or manual wiring.

### Solution

Use `db.observe(table, fn)` for callback-based subscriptions, `db.watch(table)` for `for await` loops, `toReadableStream(db.watch(table))` for ReadableStream pipelines, and `db.observeMany(tables, fn)` for combined multi-table snapshots. For deep integration with a reactive library, pass a `signals` map at construction time.

#### `observe` — callback subscription

`observe` **fires immediately** with the current table state on registration by default, then fires again on every mutation.

```ts
import { createMemory, table, type Unsubscribe } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({ schema });

// Fires immediately with current state, then on every change
const stop: Unsubscribe = db.observe('users', (rows) => {
  console.log('users snapshot:', rows.length);
});

await db.put('users', { id: 1, name: 'Alice' }); // triggers the callback again

stop();
```

Pass `{ immediate: false }` to skip the initial snapshot — useful when you already hold the current state and only want change notifications:

```ts
const rows = await db.getAll('users'); // already have current state

// immediate: false — no snapshot on registration, only subsequent mutations
db.observe('users', (updated) => render(updated), { immediate: false });

render(rows); // render initial state yourself
```

Pass `{ signal }` to cancel via an `AbortController`:

```ts
const controller = new AbortController();

db.observe('users', (rows) => render(rows), { signal: controller.signal });

await db.put('users', { id: 1, name: 'Alice' }); // triggers callback
controller.abort(); // stops the observer
```

#### `watch` — async iterable stream

`watch` always starts with an immediate snapshot and then yields one snapshot per change. The observer is cleaned up automatically when the loop exits via `break`, `return`, or an unhandled throw.

```ts
for await (const users of db.watch('users')) {
  renderList(users);

  if (shouldStop) break; // unsubscribes automatically
}
```

Stop the loop from outside using an `AbortSignal`:

```ts
const controller = new AbortController();

for await (const users of db.watch('users', { signal: controller.signal })) {
  renderList(users);
}

controller.abort(); // terminates the loop
```

By default (`mode: 'latest'`) intermediate snapshots are dropped if the consumer lags. Pass `mode: 'all'` to queue every snapshot:

```ts
for await (const users of db.watch('users', { mode: 'all' })) {
  // receives every snapshot, even if mutations were rapid
}
```

#### `toReadableStream` — ReadableStream

Wrap `db.watch()` with `toReadableStream()` to get a Web Standard `ReadableStream`. Use it with WHATWG stream pipelines or any consumer that accepts a `ReadableStream`.

```ts
import { toReadableStream } from '@vielzeug/vault';

toReadableStream(db.watch('users')).pipeTo(
  new WritableStream({ write: (users) => renderList(users) }),
);
```

Always cancel the stream when done to stop the underlying observer:

```ts
const controller = new AbortController();
const reader = toReadableStream(db.watch('users', { signal: controller.signal })).getReader();

const { value } = await reader.read(); // receives immediate snapshot
renderList(value);

controller.abort(); // unsubscribes the observer
```

The same `mode` and `signal` options as `watch()` apply.

#### `observeMany` — combined multi-table snapshot

`observeMany` fires a combined `{ [tableName]: records[] }` snapshot whenever **any** of the observed tables changes. All per-table observers fire immediately on registration. Multiple tables changed inside a single `batch()` call coalesce into one callback.

```ts
type Post = { id: number; title: string; userId: number };
const dbSchema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

const db = createMemory({ schema: dbSchema });

const stop = db.observeMany(['users', 'posts'], ({ users, posts }) => {
  console.log(`${users.length} users, ${posts.length} posts`);
});

// Both tables change — the listener fires exactly once after the batch
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
});

stop();
```

Pass `{ eager: true }` to fire the listener as soon as any table delivers its first snapshot, using empty arrays for tables not yet resolved. This is useful when some tables are large and you want to render partial data immediately:

```ts
const stop = db.observeMany(
  ['users', 'posts'],
  ({ users, posts }) => {
    // users may have data while posts is still [] on first call
    renderDashboard(users, posts);
  },
  { eager: true },
);
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

- `observe()` fires immediately on registration by default. Pass `{ immediate: false }` to skip the initial snapshot when you already hold the current state.
- `observe()` returns an `Unsubscribe` function — forgetting to call it on teardown leaks listeners. Use `watch()` or `toReadableStream(db.watch(...))` for loops where cleanup is automatic.
- `observeMany()` throws `VaultScopeError` when passed an empty `tables` array. Always provide at least one table name.
- Writes to multiple tables inside a single `batch()` call trigger `observeMany` exactly once, not once per dirty table. Writes outside a `batch()` trigger separate callbacks per table.
- For `watch()` and `toReadableStream(db.watch(...))`, the default `mode: 'latest'` silently drops intermediate snapshots when the consumer lags. Pass `mode: 'all'` if every intermediate state matters.
- The `signals` plugin calls `signal.update(() => snapshot)` synchronously inside the observer. If the signal triggers further writes to the same table (e.g., via a computed effect), this can cause a cycle. Structure your data flow so signals are downstream-only from storage.

### Related

- [Batch Writes](./batch.md)
- [CRUD](./crud.md)
- [Ripple](/ripple/)
- [Usage Guide — Reactive Reads](/vault/usage.md#reactive-reads)
- [API Reference — Adapter Interface](/vault/api.md#adapter-interface)
