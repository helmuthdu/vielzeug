---
title: Deposit Examples — Advanced
description: Batch writes, transactions, migration, lazy iteration, upsert, plugins, and testing patterns.
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

    // wait for TTL to expire
    await new Promise((r) => setTimeout(r, 10));

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
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
