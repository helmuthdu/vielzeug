---
title: 'Vault Examples — Reactive Tables'
description: 'Subscribe to table changes with observe, watch, observeMany, and signals in @vielzeug/vault.'
---

## Reactive Tables

### Problem

You need UI components or effects to re-run whenever a table's contents change. You want to subscribe to one or multiple tables and receive a fresh snapshot on every mutation, without polling or manual wiring.

### Solution

Use `db.observe(table, fn)` for callback-based subscriptions, `db.watch(table)` for `for await` loops, `db.watchStream(table)` for ReadableStream pipelines, and `db.observeMany(tables, fn)` for combined multi-table snapshots. For deep integration with a reactive library, pass a `signals` map at construction time.

#### `observe` — callback subscription

`observe` **always fires immediately** with the current table state on registration, then fires again on every mutation. There is no deferred-first-call mode.

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

#### `watchStream` — ReadableStream

`watchStream` returns a Web Standard `ReadableStream`. Use it with WHATWG stream pipelines or any consumer that accepts a `ReadableStream`.

```ts
db.watchStream('users').pipeTo(new WritableStream({ write: (users) => renderList(users) }));
```

Always cancel the stream when done to stop the underlying observer:

```ts
const reader = db.watchStream('users').getReader();

const { value } = await reader.read(); // receives immediate snapshot
renderList(value);

await reader.cancel(); // unsubscribes the observer
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

- `observe()` always fires immediately on registration — there is no deferred-first-call mode. If you need to skip the initial state, check a flag in your callback on the first invocation.
- `observe()` returns an `Unsubscribe` function — forgetting to call it on teardown leaks listeners. Use `watch()` or `watchStream()` for loops where cleanup needs to be automatic.
- `observeMany()` throws `VaultScopeError` when passed an empty `tables` array. Always provide at least one table name.
- Writes to multiple tables inside a single `batch()` call trigger `observeMany` exactly once, not once per dirty table. Writes outside a `batch()` trigger separate callbacks per table.
- For `watch()` and `watchStream()`, the default `mode: 'latest'` silently drops intermediate snapshots when the consumer lags. Use `mode: 'all'` if every intermediate state matters.
- The `signals` plugin calls `signal.update(() => snapshot)` synchronously inside the observer. If the signal triggers further writes to the same table (e.g., via a computed effect), this can cause a cycle. Structure your data flow so signals are downstream-only from storage.

### Related

- [Batch Writes](./batch.md)
- [CRUD](./crud.md)
- [Ripple](/ripple/)
- [Usage Guide — Reactive Reads](/vault/usage.md#reactive-reads)
- [API Reference — Adapter Interface](/vault/api.md#adapter-interface)
