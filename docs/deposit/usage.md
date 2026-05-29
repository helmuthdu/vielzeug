---
title: Deposit — Usage Guide
description: Practical patterns for using Deposit with LocalStorage, SessionStorage, IndexedDB, and Memory.
---

[[toc]]

## Define a Schema

```ts
import { table } from '@vielzeug/deposit';

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
import { table, ttl } from '@vielzeug/deposit';

const schema = {
  // every write to sessions uses a 30-minute TTL unless overridden at the call site
  sessions: table<Session>('id').ttl(ttl.minutes(30)),
};
```

## Create an Adapter

All four factories return the same `Adapter<S>` interface and accept the same optional plugin options.

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const db = createLocalStorage({ name: 'app', schema });
```

### SessionStorage

```ts
import { createSessionStorage } from '@vielzeug/deposit';

const db = createSessionStorage({ name: 'app', schema });
```

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const db = createIndexedDB({ name: 'app', schema, version: 1 });
```

### Memory

```ts
import { createMemory } from '@vielzeug/deposit';

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
const alice  = await db.get('users', 1);         // User | undefined
const all    = await db.getAll('users');          // User[]
const total  = await db.count('users');           // number (live records only)
const exists = await db.has('users', 1);          // boolean

// update — merges fields, keeps the original key
const updated = await db.update('users', 1, { age: 31 });

// delete
await db.delete('users', 1);
await db.clear('users');

void alice, all, total, exists, updated;
```

`update` returns the merged record, or `undefined` when the key is not found.

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
import { ttl } from '@vielzeug/deposit';

await db.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));
await db.put('users', { id: 2, name: 'Bob', age: 25 }, ttl.hours(24));
await db.put('users', { id: 3, name: 'Carol', age: 28 }, ttl.days(7));
await db.put('users', { id: 4, name: 'Dave', age: 22 }, ttl.ms(500));
```

Expired records are evicted lazily on the next read. `count()` and `getAll()` exclude them.

### Prune Expired Records

For write-heavy tables that are rarely read, expired records accumulate without lazy eviction. `pruneExpired()` sweeps all tables explicitly and returns the count deleted per table.

```ts
const pruned = await db.pruneExpired();
// { users: 42, sessions: 10 }
```

Schedule periodic pruning with `scheduleExpiredPrune`:

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/deposit';

const stop = scheduleExpiredPrune(db, { interval: ttl.hours(1) });

// on teardown
stop();
```

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
const count = await db.query('users').equals('age', 30).count();

void page, first, count;
```

### Delete via Query

```ts
const deleted = await db.query('users').filter((u) => u.age < 18).delete();
```

Returns the number of deleted records.

## Lazy Iteration

`iterate(table)` returns an `AsyncIterable` — useful for processing large tables without loading all records into memory at once.

```ts
for await (const user of db.iterate('users')) {
  if (user.age >= 18) {
    await processUser(user);
  }
}
```

Expired records are skipped automatically.

## Reactive Reads

### `observe`

`observe(table, listener)` fires the listener whenever the table changes. By default it does **not** fire an initial snapshot — only future mutations trigger the callback. Pass `{ immediate: true }` to also receive the current table state immediately on registration.

```ts
// future changes only (default)
const stop = db.observe('users', (rows) => {
  console.log('users updated:', rows.length);
});

// fire immediately with current state, then on every change
const stopImmediate = db.observe('users', handleChange, { immediate: true });

await db.put('users', { id: 1, name: 'Alice', age: 30 }); // triggers both listeners

stop();
stopImmediate();
```

Always call the returned unsubscribe function on teardown to prevent memory leaks.

### `watch` — AsyncIterable Stream

`watch(table)` returns an `AsyncIterable` that yields a fresh snapshot on every change, **always starting with an immediate snapshot**. It is the `for await` companion to `observe`.

```ts
for await (const users of db.watch('users')) {
  renderTable(users);
}
```

The observer is cleaned up automatically when the loop exits via `break`, `return`, or an unhandled error. No explicit unsubscribe is needed.

### `observeMany` — Combined Multi-Table Snapshot

`observeMany(tables, listener)` subscribes to multiple tables at once and delivers a single combined snapshot `{ [tableName]: RecordOf<S, T>[] }` whenever any observed table changes.

The listener fires once after all tables have been prefetched, ensuring the snapshot is always complete regardless of which table triggers it.

```ts
const stop = db.observeMany(['users', 'posts'], ({ users, posts }) => {
  renderDashboard(users, posts);
});

// fire immediately with current state of all tables
const stopImmediate = db.observeMany(
  ['users', 'posts'],
  ({ users, posts }) => renderDashboard(users, posts),
  { immediate: true },
);

stop();
stopImmediate();
```

Writes to multiple tables inside a single `batch()` call coalesce into one callback — observers fire exactly once per microtask, not once per dirty table.

> `tables` must be non-empty. Passing an empty array throws `DepositScopeError`.

## Batch Writes

`batch(tables, tx => ...)` defers all observer notifications until the callback resolves. On IndexedDB it also runs inside a real atomic IDB transaction.

```ts
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice', age: 30 });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });

  // query and delete are also available inside the callback
  await tx.query('posts').filter((p) => p.title.startsWith('H')).delete();
});
```

`batch()` is table-scoped at runtime and type level:

- the table list must not be empty
- inside `tx`, operations on tables not included in `tables` throw `DepositScopeError`

`getOrDefault` is also available inside `batch()` callbacks — it is a read-or-insert: returns the existing record if present, otherwise calls `defaultFn()`, writes and returns the result.

```ts
await db.batch(['users'], async (tx) => {
  const user = await tx.getOrDefault('users', 42, () => ({ id: 42, name: 'Guest' }));
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
import { createIndexedDB, type MigrationFn } from '@vielzeug/deposit';

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
import { createMemory } from '@vielzeug/deposit';

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
import { createMemory } from '@vielzeug/deposit';

const db = createMemory({
  schema,
  logger: createLogger('db'),
});
```

### Record Validation (`validators`)

Pass a `@vielzeug/sieve` schema or any object with `parse(value): T`. Validators run before every `put`, `putAll`, `update`, and `upsert`.

```ts
import { s } from '@vielzeug/sieve';
import { createMemory } from '@vielzeug/deposit';

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

Tracked operations: `get`, `getAll`, `getMany`, `has`, `put`, `putAll`, `deleteMany`, `count`, `delete`, `clear`, `update`, `upsert`, `getOrDefault`, `batch`, `query`, `queryDelete`, `iterate`.

For `batch` operations, `event.table` is `'*'` because a batch may span multiple tables.

### Quota Exceeded Hook (`onQuotaExceeded`) — LocalStorage / SessionStorage

Called when a write exceeds the storage quota. The callback receives a `DepositQuotaError`. Return `'ignore'` to silently drop the write, or `'throw'` (default) to rethrow.

```ts
import { createLocalStorage, type DepositQuotaError } from '@vielzeug/deposit';

const db = createLocalStorage({
  name: 'app',
  schema,
  onQuotaExceeded: (table, error: DepositQuotaError) => {
    console.warn(`[${String(table)}] quota exceeded — dropping write`, error.message);
    return 'ignore';
  },
});
```

## Environment-Based Adapter Selection

All factories return the same `Adapter<S>` type, making it straightforward to select a backend at runtime.

```ts
import {
  createIndexedDB,
  createLocalStorage,
  createMemory,
  type Adapter,
} from '@vielzeug/deposit';

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

All errors thrown by `@vielzeug/deposit` are instances of `DepositError`. Catch the base class to handle any deposit-originated error, or catch specific subclasses for fine-grained handling.

```ts
import {
  DepositDisposedError,
  DepositError,
  DepositMigrationError,
  DepositQuotaError,
  DepositScopeError,
} from '@vielzeug/deposit';

try {
  await db.put('users', { id: 1, name: 'Alice', age: 30 });
} catch (err) {
  if (err instanceof DepositDisposedError) {
    // operation on a disposed adapter
  } else if (err instanceof DepositScopeError) {
    // table not in batch() scope, or empty tables array passed to observeMany
  } else if (err instanceof DepositQuotaError) {
    // WebStorage quota exceeded (also sent to onQuotaExceeded if configured)
  } else if (err instanceof DepositMigrationError) {
    // IndexedDB onupgradeneeded migration threw
  } else if (err instanceof DepositError) {
    // any other deposit error
  }
}
```

| Class | Thrown when |
| --- | --- |
| `DepositError` | Base class — catch all deposit errors |
| `DepositDisposedError` | Any operation after `dispose()` |
| `DepositScopeError` | `batch()` accesses a table outside its declared scope; empty array passed to `observeMany` |
| `DepositQuotaError` | A LocalStorage / SessionStorage write exceeds the storage quota |
| `DepositMigrationError` | IndexedDB `onupgradeneeded` migration callback threw |

## Best Practices

- Prefer `createIndexedDB` for large datasets or flows that require atomicity.
- Use `createMemory` in tests — no cleanup, no browser API requirements.
- Always call the `observe()` unsubscribe function on component teardown (or use `watch()` which auto-unsubscribes on loop exit).
- Use `batch()` when writing to multiple tables to batch observer notifications.
- Use `ttl.*` helpers — raw millisecond numbers are rejected by the type system.
- Keep `batch()` callbacks focused on storage operations; avoid arbitrary async side effects.
- Schedule `scheduleExpiredPrune` for write-heavy tables with TTL to reclaim storage proactively.
