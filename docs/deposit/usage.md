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

## Basic CRUD

```ts
// write
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.putAll('users', [
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Carol', age: 28 },
]);

// read
const alice = await db.get('users', 1);         // User | undefined
const all   = await db.getAll('users');          // User[]
const total = await db.count('users');           // number (live records only)
const exists = await db.has('users', 1);         // boolean

// update — merges fields, keeps the original key
const updated = await db.update('users', 1, { age: 31 });

// delete
await db.delete('users', 1);
await db.clear('users');

void alice, all, total, exists, updated;
```

`update` returns the merged record, or `undefined` when the key is not found.

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

`observe(table, listener)` fires the listener whenever the table changes. It emits an initial snapshot by default.

```ts
const stop = db.observe('users', (rows) => {
  console.log('users updated:', rows.length);
});

// suppress the initial snapshot when you only need future changes
const stopSilent = db.observe('users', handleChange, { immediate: false });

await db.put('users', { id: 1, name: 'Alice', age: 30 }); // triggers both listeners

stop();
stopSilent();
```

Always call the returned unsubscribe function on teardown to prevent memory leaks.

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
- inside `tx`, operations on tables not included in `tables` throw

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

All four adapters accept the same optional plugin options.

### Logger

Pass a `@vielzeug/logit` logger or any object with an `error(...)` method. Observer notification errors are routed to `logger.error`.

```ts
import { createLogger } from '@vielzeug/logit';
import { createMemory } from '@vielzeug/deposit';

const db = createMemory({
  schema,
  logger: createLogger('db'),
});
```

### Record Validation

Pass a `@vielzeug/validit` schema or any object with `parse(value): T`. Validators run before every `put`, `putAll`, `update`, and `upsert`.

```ts
import { v } from '@vielzeug/validit';
import { createMemory } from '@vielzeug/deposit';

const db = createMemory({
  schema,
  validators: {
    users: v.object({ id: v.number(), name: v.string(), age: v.number() }),
  },
});
```

Any value that fails `parse` causes the write to throw before touching storage.

### Metrics

`onMetrics` is called after every operation with timing and table name. Use it for performance monitoring.

```ts
const db = createMemory({
  schema,
  onMetrics: (event) => {
    console.log(`[${event.table}] ${event.operation} — ${event.duration}ms`);
  },
});
```

Tracked operations: `get`, `getAll`, `has`, `put`, `putAll`, `count`, `delete`, `clear`, `update`, `upsert`, `batch`, `query`, `queryDelete`, `iterate`.

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

Call `dispose()` when the adapter is no longer needed. This disconnects observers, closes the BroadcastChannel (IDB), and releases the IDB connection.

```ts
db.dispose();
```

## Best Practices

- Prefer `createIndexedDB` for large datasets or flows that require atomicity.
- Use `createMemory` in tests — no cleanup, no browser API requirements.
- Always call the `observe()` unsubscribe function on component teardown.
- Use `batch()` when writing to multiple tables to batch observer notifications.
- Use `ttl.*` helpers — raw millisecond numbers are rejected by the type system.
- Keep `batch()` callbacks focused on storage operations; avoid arbitrary async side effects.
