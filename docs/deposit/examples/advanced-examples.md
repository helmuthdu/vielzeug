---
title: Deposit Examples — Advanced
description: Batch writes, transactions, reactive signals, watch, getMany, TTL pruning, migration, lazy iteration, upsert, plugins, and testing patterns.
---

## Atomic Batch (IndexedDB)

`batch()` on IndexedDB runs inside a real IDB transaction — either all writes commit or none do.

```ts
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

const db = createIndexedDB({ name: 'blog', schema, version: 1 });

await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
});
```

`batch()` is strict: only tables listed in the first argument can be accessed inside the callback.

## Rollback on Error (IndexedDB)

If the `batch` callback throws, the IDB transaction is aborted and all writes are rolled back.

```ts
await db.put('users', { id: 2, name: 'Bob' });

try {
  await db.batch(['users'], async (tx) => {
    await tx.delete('users', 2);
    throw new Error('abort');
  });
} catch {}

// Bob still exists — the IDB transaction was rolled back.
const bob = await db.get('users', 2);
```

## Deferred Notifications (All Adapters)

On non-IDB adapters, `batch()` defers observer notifications: all listeners fire once after the callback resolves, not after each individual write.

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';

const db = createLocalStorage({ name: 'app', schema });

db.observe('users', (rows) => console.log('notified once with', rows.length, 'users'));

// Only one observer notification fires — after both puts complete.
await db.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('users', { id: 2, name: 'Bob' });
});
```

## Bulk Key Lookup with `getMany`

`getMany` fetches multiple records by key in a single call. The result array preserves input key order; missing keys yield `undefined`.

```ts
await db.putAll('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Carol' },
]);

const [alice, unknown, carol] = await db.getMany('users', [1, 99, 3]);
// → [User, undefined, User]
```

`getMany` is also available inside `batch()` callbacks, scoped to the declared tables:

```ts
await db.batch(['users', 'posts'], async (tx) => {
  const [user1, user2] = await tx.getMany('users', [1, 2]);
  const enriched = (await tx.getAll('posts')).map((p) => ({
    ...p,
    authorName: p.userId === 1 ? user1?.name : user2?.name,
  }));
  await tx.putAll('posts', enriched);
});
```

## Reactive Tables with `watch`

`watch(table)` returns an `AsyncIterable` that yields a fresh snapshot on every change, starting immediately. The observer is cleaned up when the loop exits.

```ts
// Run this in a background task or component effect
for await (const users of db.watch('users')) {
  renderUserList(users);
}
// → loop exits on break/return, observer automatically unsubscribed
```

Use `break` to stop watching:

```ts
for await (const users of db.watch('users')) {
  renderUserList(users);

  if (shouldStop) break;
}
```

## Reactive Signals (`signals` plugin)

Wire `@vielzeug/stateit` signals at construction time. The signal is kept in sync with the table automatically — no `observe()` boilerplate needed.

```ts
import { signal } from '@vielzeug/stateit';
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const usersSignal = signal<User[]>([]);

const db = createIndexedDB({
  name: 'app',
  schema,
  signals: { users: usersSignal },
  version: 1,
});

// usersSignal.value is always in sync with the users table.
// In a craftit/buildit component or effect:
// effect(() => renderList(usersSignal.value));
```

The signal is updated via `signal.update(() => snapshot)` on every table change. Any object with `update(fn)` satisfies the `ReactiveSignal<T>` interface structurally — no import of `@vielzeug/stateit` is needed in the deposit layer.

Signals are wired immediately on construction and cleaned up on `dispose()`.

## TTL Pruning

For write-heavy tables that are rarely read, call `pruneExpired()` to sweep all tables and reclaim storage. Returns the count of records deleted per table.

```ts
const pruned = await db.pruneExpired();
console.log('pruned:', pruned);
// { users: 42, sessions: 17 }
```

For continuous maintenance, use `scheduleExpiredPrune`:

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/deposit';

// Prune every hour
const stop = scheduleExpiredPrune(db, { interval: ttl.hours(1) });

// On app teardown
stop();
db.dispose();
```

On **IndexedDB**, pruning is cursor-based — expired records are deleted without loading values into memory. On **LocalStorage / SessionStorage** and **Memory**, expired records are detected per-key during the scan.

## Bulk Write with putAll

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/deposit';

type Session = { id: string; userId: number };
const schema = { sessions: table<Session>('id') };

const db = createIndexedDB({ name: 'app', schema, version: 1 });

await db.putAll(
  'sessions',
  [
    { id: 's1', userId: 1 },
    { id: 's2', userId: 2 },
  ],
  ttl.hours(2),
);

console.log(await db.has('sessions', 's1')); // true
```

All records share the same TTL. For IDB, `putAll` runs in a single atomic IDB transaction.

## Upsert

Read-modify-write in one call. The callback receives the existing record (or `undefined`) and must return the updated record.

```ts
// Atomically increment a view counter, creating the record if it doesn't exist.
await db.upsert('posts', 10, (existing) => ({
  id: 10,
  title: existing?.title ?? 'Untitled',
  views: (existing?.views ?? 0) + 1,
}));
```

## Lazy Iteration

`iterate()` yields records one at a time — useful for large tables where loading everything into memory is undesirable.

```ts
let exported = 0;

for await (const user of db.iterate('users')) {
  await exportToRemote(user);
  exported++;
}

console.log('exported', exported, 'users');
```

## Debug Info

```ts
const info = await db.debug();

for (const table of info.tables) {
  console.log(`${table.name}: ${table.recordCount} live, ${table.expiredCount} expired`);
}
```

## IndexedDB Migration Hook

```ts
import { createIndexedDB, table, type MigrationFn } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({ name: 'blog', migrate, schema, version: 2 });

void db;
```

## Logger Plugin

Pass a `@vielzeug/logit` logger (or any object with `error(...)`). Observer notification errors are routed to `logger.error`.

```ts
import { createLogger } from '@vielzeug/logit';
import { createIndexedDB } from '@vielzeug/deposit';

const db = createIndexedDB({
  name: 'app',
  schema,
  version: 1,
  logger: createLogger('deposit'),
});
```

## Validation Plugin

Pass a `@vielzeug/validit` schema per table. `parse` runs before every `put`, `putAll`, `update`, and `upsert`.

```ts
import { v } from '@vielzeug/validit';
import { createMemory, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  validators: {
    users: v.object({ id: v.number(), name: v.string() }),
  },
});
```

## Metrics Plugin

```ts
const db = createMemory({
  schema,
  onMetrics: ({ table, operation, duration }) => {
    console.log(`[${table}] ${operation} took ${duration}ms`);
  },
});
```

## Quota Exceeded Hook (LocalStorage / SessionStorage)

Gracefully handle storage quota errors instead of propagating exceptions.

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const db = createLocalStorage({
  name: 'app',
  schema,
  onQuotaExceeded: (table, error) => {
    // log or evict stale data here
    console.warn(`[${String(table)}] quota exceeded — dropping write`, error);
    return 'ignore'; // silently skip the write
  },
});
```

Return `'throw'` (the default) to propagate the error as before.

## Testing with the Memory Adapter

Swap any adapter for `createMemory` in test setup — no browser APIs, no cleanup boilerplate, TTL-accurate.

```ts
import { createMemory, ttl } from '@vielzeug/deposit';
import { schema } from '../src/schema';

describe('user repository', () => {
  let db: ReturnType<typeof createMemory<typeof schema>>;

  beforeEach(() => {
    db = createMemory({ schema });
  });

  test('can check existence without fetching the full record', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 99)).toBe(false);
  });

  test('expired records are invisible', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));

    await new Promise((r) => setTimeout(r, 10));

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
  });

  test('getMany returns ordered results with undefined for missing keys', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 3, name: 'Carol' },
    ]);

    const result = await db.getMany('users', [3, 99, 1]);

    expect(result).toEqual([
      { id: 3, name: 'Carol' },
      undefined,
      { id: 1, name: 'Alice' },
    ]);
  });

  test('putAll seeds fixtures in one call', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const first = await db.query('users').orderBy('name', 'asc').first();
    expect(first?.name).toBe('Alice');
  });
});
```
