---
title: Vault — Usage Guide
description: Practical patterns for using Vault with LocalStorage, SessionStorage, IndexedDB, and Memory.
---

[[toc]]

## Basic Usage

```ts
import { table } from '@vielzeug/vault';

type User = { id: number; name: string; age: number };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};
```

`table<T>(key)` captures both the record type and the primary-key field name. The TypeScript compiler enforces that `key` is a valid field of `T`, and downstream operations — `get`, `delete`, `has`, `upsert` — accept only the correct key type.

You can set a per-table default TTL with `.ttl()`:

```ts
import { table, ttl } from '@vielzeug/vault';

const schema = {
  // every write to sessions uses a 30-minute TTL unless overridden at the call site
  sessions: table<Session>('id').ttl(ttl.minutes(30)),
};
```

## Create an Adapter

All four factories return the same `Adapter<S>` interface and accept the same optional plugin options.

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/vault';

const db = createLocalStorage({ name: 'app', schema });
```

### SessionStorage

```ts
import { createSessionStorage } from '@vielzeug/vault';

const db = createSessionStorage({ name: 'app', schema });
```

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/vault';

const db = createIndexedDB({ name: 'app', schema, version: 1 });
```

### Memory

```ts
import { createMemory } from '@vielzeug/vault';

const db = createMemory({ schema });
```

No browser APIs required. Use this in unit tests and SSR environments.

Pass an optional `name` to enable cross-tab (or cross-window) synchronisation via `BroadcastChannel`. All `createMemory` instances with the same `name` in the same origin replicate mutations to each other.

```ts
const db = createMemory({ name: 'shared-state', schema });
```

If `BroadcastChannel` is not available in the environment, the option is silently ignored.

## Basic CRUD

```ts
// write
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.putAll('users', [
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Carol', age: 28 },
]);

// read
const alice = await db.get('users', 1); // User | undefined
const all = await db.getAll('users'); // User[]
const total = await db.count('users'); // number (live records only)
const exists = await db.has('users', 1); // boolean

// update — merges fields, throws VaultError if key does not exist
const updated = await db.update('users', 1, { age: 31 });

// delete
await db.delete('users', 1);
await db.clear('users');

(void alice, all, total, exists, updated);
```

`update` returns the merged record or throws `VaultError` when the key is not found. Use `upsert` for insert-or-update semantics.

## Key and Entry Reads

`keys(table)` returns the primary key of every live record without fetching the full records. Useful for existence checks, diffing, and cache invalidation.

```ts
const ids = await db.keys('users'); // number[]
```

`entries(table)` returns all `[key, record]` pairs in a single call.

```ts
const pairs = await db.entries('users'); // [number, User][]
```

Both are also available inside `batch()` callbacks.

`isEmpty(table)` returns `true` when a table has no live records — equivalent to `(await db.count(table)) === 0`, including TTL-expired records being treated as absent.

```ts
if (await db.isEmpty('users')) {
  await db.putAll('users', defaultUsers);
}
```

## Bulk Key Lookup

`getMany(table, keys)` fetches multiple records in a single call. Missing keys return `undefined`. The result array preserves the input key order.

```ts
const [alice, missing, carol] = await db.getMany('users', [1, 99, 3]);
// → [User, undefined, User]
```

`getMany` is also available inside `batch()` callbacks.

## Use TTL

TTL must always be specified via the `ttl` helper. Raw numbers are rejected at the type level.

```ts
import { ttl } from '@vielzeug/vault';

await db.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));
await db.put('users', { id: 2, name: 'Bob', age: 25 }, ttl.hours(24));
await db.put('users', { id: 3, name: 'Carol', age: 28 }, ttl.days(7));
await db.put('users', { id: 4, name: 'Dave', age: 22 }, ttl.ms(500));
```

Expired records are evicted lazily on the next read. `count()` and `getAll()` exclude them.

### Prune Expired Records

For write-heavy tables that are rarely read, expired records accumulate without lazy eviction. `pruneExpired()` sweeps tables explicitly and returns the count deleted per table.

```ts
// Prune all tables
const pruned = await db.pruneExpired();
// { users: 42, sessions: 10 }

// Prune only specific tables
const partial = await db.pruneExpired(['sessions']);
// { sessions: 10, users: 0 }
```

Schedule periodic pruning with `scheduleExpiredPrune`:

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

const stop = scheduleExpiredPrune(db, { interval: ttl.hours(1) });

// on teardown (before dispose)
stop();
```

The schedule also stops automatically if the adapter is disposed before the timer fires — `VaultDisposedError` thrown by `pruneExpired()` is caught and the interval is cleared.

On **IndexedDB**, pruning uses a cursor-based pass — expired records are deleted without loading them into memory. On **LocalStorage / SessionStorage** and **Memory**, expired records are detected and removed during the scan.

## Upsert

`upsert` performs a read-modify-write atomically. The callback receives the current record (or `undefined`) and must return the new record.

```ts
// increment a counter even if the record doesn't yet exist
await db.upsert('users', 42, (existing) => ({
  id: 42,
  name: existing?.name ?? 'Unknown',
  age: (existing?.age ?? 0) + 1,
}));
```

## Query Data

Queries are lazy pipelines that execute on the terminal call.

```ts
const page = await db
  .query('users')
  .between('age', 18, 99)
  .startsWith('name', 'a', { ignoreCase: true })
  .orderBy('name', 'asc')
  .limit(20)
  .offset(0)
  .toArray();

const first = await db.query('users').orderBy('age', 'asc').first();

// count() respects limit/offset — returns the number of records in the current page
const count = await db.query('users').equals('age', 30).limit(10).count();

// totalCount() ignores limit/offset/orderBy — returns the full filtered set size
const total = await db.query('users').equals('age', 30).totalCount();

(void page, first, count, total);
```

Use `totalCount()` alongside `limit`/`offset` for "page X of N" UIs:

```ts
const pageSize = 20;
const pageIndex = 2;

const q = db.query('users').between('age', 18, 99).orderBy('name', 'asc');

const [page, total] = await Promise.all([
  q
    .limit(pageSize)
    .offset(pageIndex * pageSize)
    .toArray(),
  q.totalCount(),
]);

console.log(`Page ${pageIndex + 1} of ${Math.ceil(total / pageSize)}`, page);
```

### Delete via Query

```ts
const deleted = await db
  .query('users')
  .filter((u) => u.age < 18)
  .delete();
```

Returns the number of deleted records.

## Lazy Iteration (IndexedDB)

`iterate(table)` is available on the `IndexedDbAdapter` returned by `createIndexedDB`. It streams records via an IDB cursor — the full table is never loaded into memory.

For memory and web storage adapters, use `getAll()` or `query().toArray()` instead.

```ts
import { createIndexedDB, table } from '@vielzeug/vault';

const db = createIndexedDB({ name: 'app', schema, version: 1 });

for await (const user of db.iterate('users')) {
  if (user.age >= 18) {
    await processUser(user);
  }
}
```

Expired records are skipped automatically. Each call opens a fresh readonly IDB transaction.

## Reactive Reads

### `observe`

`observe(table, listener)` subscribes to table changes. **It always fires immediately with the current table state on registration**, then fires again on every mutation. There is no deferred-first-call mode.

```ts
// Always fires immediately, then on every change
const stop = db.observe('users', (rows) => {
  console.log('users snapshot:', rows.length);
});

await db.put('users', { id: 1, name: 'Alice', age: 30 }); // triggers listener again

stop();
```

Pass `{ signal }` to cancel the observer via an `AbortController` — a clean alternative to storing and calling the returned stop function.

```ts
const controller = new AbortController();

db.observe('users', (rows) => render(rows), { signal: controller.signal });

// later:
controller.abort(); // stops the observer
```

Always unsubscribe on teardown to prevent memory leaks.

### `watch` — AsyncIterable Stream

`watch(table)` returns an `AsyncIterable` that yields a fresh snapshot on every change, **always starting with an immediate snapshot**. It is the `for await` companion to `observe`.

```ts
for await (const users of db.watch('users')) {
  renderTable(users);
}
```

The observer is cleaned up automatically when the loop exits via `break`, `return`, or an unhandled error.

Stop the loop from outside using an `AbortSignal`:

```ts
const controller = new AbortController();

for await (const users of db.watch('users', { signal: controller.signal })) {
  renderTable(users);
}

controller.abort(); // terminates the loop
```

By default (`mode: 'latest'`) intermediate snapshots are dropped if the consumer lags. Pass `mode: 'all'` to queue every snapshot instead.

### `watchStream` — ReadableStream

`watchStream(table)` returns a Web Standard `ReadableStream` of snapshots. Use it with WHATWG stream pipelines or in environments that consume `ReadableStream` directly.

```ts
db.watchStream('users').pipeTo(new WritableStream({ write: (users) => render(users) }));
```

Always cancel the stream (or pass a `signal`) to stop the underlying observer:

```ts
const reader = db.watchStream('users').getReader();

for (;;) {
  const { value: users, done } = await reader.read();
  if (done) break;
  render(users);
}

await reader.cancel(); // unsubscribes the observer
```

The same `mode` and `signal` options as `watch()` apply.

### `observeMany` — Combined Multi-Table Snapshot

`observeMany(tables, listener)` subscribes to multiple tables at once and delivers a single combined snapshot `{ [tableName]: RecordOf<S, T>[] }` whenever any observed table changes.

All per-table observers fire immediately on registration. The combined listener fires once all tables have reported their initial snapshot, ensuring the combined view is always complete.

```ts
const stop = db.observeMany(['users', 'posts'], ({ users, posts }) => {
  renderDashboard(users, posts);
});
```

Writes to multiple tables inside a single `batch()` call coalesce into one callback — the listener fires exactly once per microtask, not once per dirty table.

Pass `{ signal }` to cancel all observers at once:

```ts
const controller = new AbortController();

db.observeMany(['users', 'posts'], ({ users, posts }) => renderDashboard(users, posts), {
  signal: controller.signal,
});

controller.abort();
```

> `tables` must be non-empty. Passing an empty array throws `VaultScopeError`.

## Batch Writes

`batch(tables, tx => ...)` defers all observer notifications until the callback resolves. On IndexedDB it also runs inside a real atomic IDB transaction.

```ts
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice', age: 30 });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });

  // query and delete are also available inside the callback
  await tx
    .query('posts')
    .filter((p) => p.title.startsWith('H'))
    .delete();
});
```

`batch()` is table-scoped at runtime and type level:

- the table list must not be empty
- inside `tx`, operations on tables not included in `tables` throw `VaultScopeError`

`getOrDefault` is also available inside `batch()` callbacks — it is a read-or-insert: returns the existing record if present, otherwise calls `defaultFn()`, writes and returns the result.

```ts
await db.batch(['users'], async (tx) => {
  const user = await tx.getOrDefault('users', 42, () => ({ id: 42, name: 'Guest', age: 0 }));
  // user is either the existing record or the newly inserted default
});
```

For **IndexedDB**, `getOrDefault` inside `batch()` is atomic — the check and insert happen inside the same IDB transaction. For Memory and WebStorage adapters, it is a logical read-then-write but not physically atomic.

If the callback throws on **IndexedDB**, the IDB transaction is rolled back automatically. On other adapters the callback's side effects are not rolled back, but no observer notifications are fired.

## Debug

`debug()` returns live vs expired record counts per table. Useful during development.

```ts
const info = await db.debug();

for (const table of info.tables) {
  console.log(table.name, '— live:', table.recordCount, 'expired:', table.expiredCount);
}
```

## Handle Schema Migrations (IndexedDB)

```ts
import { createIndexedDB, type MigrationFn } from '@vielzeug/vault';

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({
  name: 'app',
  migrate,
  schema,
  version: 2,
});

void db;
```

## Plugins

All four adapters accept the same optional plugin options at construction time. Each plugin uses a structural interface — pass the real package object directly, no adapter or wrapper needed.

### Reactive Signals (`signals`)

Wire `@vielzeug/ripple` signals directly. Each signal is automatically kept in sync with its table via `observe()` and cleaned up on `dispose()`.

```ts
import { signal } from '@vielzeug/ripple';
import { createMemory } from '@vielzeug/vault';

const usersSignal = signal<User[]>([]);

const db = createMemory({
  schema,
  signals: { users: usersSignal },
});

// usersSignal.value is now always in sync with the users table
```

Any object with an `update(fn: (current: T) => T): void` method satisfies `ReactiveSignal<T>` structurally. `@vielzeug/ripple` `Signal<T>` and `Store<T>` both satisfy this directly.

### Logger (`logger`)

Pass a `@vielzeug/rune` logger or any object with an `error(...)` method. Observer notification errors are routed to `logger.error`.

```ts
import { createLogger } from '@vielzeug/rune';
import { createMemory } from '@vielzeug/vault';

const db = createMemory({
  schema,
  logger: createLogger('db'),
});
```

### Record Validation (`validators`)

Pass a `@vielzeug/spell` schema or any object with `parse(value): T`. Validators run before every `put`, `putAll`, `update`, and `upsert`.

```ts
import { s } from '@vielzeug/spell';
import { createMemory } from '@vielzeug/vault';

const db = createMemory({
  schema,
  validators: {
    users: v.object({ id: v.number(), name: v.string(), age: v.number() }),
  },
});
```

Any value that fails `parse` causes the write to throw before touching storage.

### Metrics (`onMetrics`)

`onMetrics` is called after every operation with timing and table name. Use it for performance monitoring.

```ts
const db = createMemory({
  schema,
  onMetrics: (event) => {
    console.log(`[${event.table}] ${event.operation} — ${event.duration}ms`);
  },
});
```

Tracked operations: `get`, `getAll`, `getMany`, `getOrDefault`, `keys`, `entries`, `has`, `put`, `putAll`, `deleteMany`, `count`, `delete`, `clear`, `update`, `upsert`, `batch`, `query`, `queryDelete`.

For `batch` operations, `event.table` is `'*'` because a batch may span multiple tables.

### Quota Exceeded Hook (`onQuotaExceeded`) — LocalStorage / SessionStorage

Called when a write exceeds the storage quota. The callback receives a `VaultQuotaError`. Return `'ignore'` to silently drop the write, or `'throw'` (default) to rethrow.

```ts
import { createLocalStorage, type VaultQuotaError } from '@vielzeug/vault';

const db = createLocalStorage({
  name: 'app',
  schema,
  onQuotaExceeded: (table, error: VaultQuotaError) => {
    console.warn(`[${String(table)}] quota exceeded — dropping write`, error.message);
    return 'ignore';
  },
});
```

## Environment-Based Adapter Selection

All factories return the same `Adapter<S>` type, making it straightforward to select a backend at runtime.

```ts
import { createIndexedDB, createLocalStorage, createMemory, type Adapter } from '@vielzeug/vault';

function createStorage(): Adapter<typeof schema> {
  if (typeof indexedDB !== 'undefined') {
    return createIndexedDB({ name: 'app', schema, version: 1 });
  }

  if (typeof localStorage !== 'undefined') {
    return createLocalStorage({ name: 'app', schema });
  }

  return createMemory({ schema });
}
```

## Lifecycle

Call `dispose()` when the adapter is no longer needed. This disconnects observers, signal subscriptions, the BroadcastChannel (IDB), and the IDB connection.

```ts
db.dispose();
```

## Error Handling

All errors thrown by `@vielzeug/vault` are instances of `VaultError`. Catch the base class to handle any vault-originated error, or catch specific subclasses for fine-grained handling.

```ts
import { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from '@vielzeug/vault';

try {
  await db.put('users', { id: 1, name: 'Alice', age: 30 });
} catch (err) {
  if (err instanceof VaultDisposedError) {
    // operation on a disposed adapter
  } else if (err instanceof VaultScopeError) {
    // table not in batch() scope, or empty tables array passed to observeMany
  } else if (err instanceof VaultQuotaError) {
    // WebStorage quota exceeded (also sent to onQuotaExceeded if configured)
  } else if (err instanceof VaultMigrationError) {
    // IndexedDB onupgradeneeded migration threw
  } else if (err instanceof VaultError) {
    // any other vault error
  }
}
```

| Class                 | Thrown when                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `VaultError`          | Base class — catch all vault errors                                                        |
| `VaultDisposedError`  | Any operation after `dispose()`                                                            |
| `VaultScopeError`     | `batch()` accesses a table outside its declared scope; empty array passed to `observeMany` |
| `VaultQuotaError`     | A LocalStorage / SessionStorage write exceeds the storage quota                            |
| `VaultMigrationError` | IndexedDB `onupgradeneeded` migration callback threw                                       |

## Framework Integration

Use `db.observe()` for framework subscriptions. The returned unsubscribe function maps directly to each framework's cleanup hook.

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { createMemory, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };
const db = createMemory({ schema });

function useUsers(): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // observe always fires immediately — setUsers is called once on mount, then on each change
    return db.observe('users', setUsers);
  }, []);

  return users;
}
```

```ts [Vue 3]
import { onScopeDispose, ref } from 'vue';
import { createMemory, table } from '@vielzeug/vault';
import type { Ref } from 'vue';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };
const db = createMemory({ schema });

export function useUsers(): { users: Ref<User[]> } {
  const users = ref<User[]>([]);

  // observe always fires immediately — users.value is populated on composition
  const stop = db.observe('users', (rows) => {
    users.value = rows;
  });

  onScopeDispose(stop);

  return { users };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createMemory, table } from '@vielzeug/vault';

  type User = { id: number; name: string };
  const schema = { users: table<User>('id') };
  const db = createMemory({ schema });

  let users: User[] = [];
  const stop = db.observe('users', (rows) => { users = rows; });

  onDestroy(stop);
</script>

{#each users as user}
  <p>{user.name}</p>
{/each}
```

:::

For libraries with a reactive context (`scope`, `onUnmounted`, signal effects), you can also use `db.watch(table)` inside an async loop — the observer is cleaned up automatically when the loop exits.

## Working with Other Vielzeug Libraries

### With Ripple

Wire a `@vielzeug/ripple` signal to a table at construction time. The signal is updated automatically on every table change — no `observe()` boilerplate required.

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

// usersSignal.value stays in sync with the users table automatically
effect(() => console.log('users:', usersSignal.value.length));

await db.put('users', { id: 1, name: 'Alice' }); // → effect re-runs
```

### With Spell

Pass a `@vielzeug/spell` schema as a validator. Vault calls `schema.parse(value)` before every `put`, `putAll`, `update`, and `upsert`. Invalid records throw without touching storage.

```ts
import { s } from '@vielzeug/spell';
import { createMemory, table } from '@vielzeug/vault';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  validators: {
    users: s.object({ id: s.number(), name: s.string(), age: s.number().min(0) }),
  },
});

// throws a sieve validation error before writing
await db.put('users', { id: 1, name: 'Alice', age: -1 });
```

### With Rune

Pass a `@vielzeug/rune` logger to route observer notification errors to your structured log pipeline.

```ts
import { createLogger } from '@vielzeug/rune';
import { createIndexedDB, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createIndexedDB({
  name: 'app',
  schema,
  version: 1,
  logger: createLogger('vault'),
});
```

## Best Practices

- Prefer `createIndexedDB` for large datasets or flows that require atomicity.
- Use `createMemory` in tests — no cleanup, no browser API requirements.
- Always call the `observe()` unsubscribe function on component teardown (or use `watch()` which auto-unsubscribes on loop exit).
- Use `batch()` when writing to multiple tables to batch observer notifications.
- Use `ttl.*` helpers — raw millisecond numbers are rejected by the type system.
- Keep `batch()` callbacks focused on storage operations; avoid arbitrary async side effects.
- Schedule `scheduleExpiredPrune` for write-heavy tables with TTL to reclaim storage proactively.
