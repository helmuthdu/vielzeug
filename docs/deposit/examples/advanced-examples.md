---
title: Deposit Examples — Advanced
description: Transaction, migration, bulk write, and testing patterns for advanced deposit usage.
---

## Atomic Multi-Table Transaction

```ts
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

const db = createIndexedDB({ dbName: 'blog', schemaVersion: 1, schema });

await db.transaction(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
});
```

## Transaction Rollback on Error

```ts
await db.put('users', { id: 2, name: 'Bob' });

try {
  await db.transaction(['users'], async (tx) => {
    await tx.delete('users', 2);
    throw new Error('abort transaction');
  });
} catch {}

// Bob still exists because the transaction was aborted.
const bob = await db.get('users', 2);
```

## Bulk Writes with putAll

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/deposit';

type Session = { id: string; userId: number };
const schema = { sessions: table<Session>('id') };

const db = createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });

// All records written in one atomic transaction, all sharing the same TTL.
await db.putAll('sessions', [
  { id: 's1', userId: 1 },
  { id: 's2', userId: 2 },
], ttl.hours(2));

console.log(await db.has('sessions', 's1')); // true
```

## TTL Cache Entry

```ts
import { createLocalStorage, table, ttl } from '@vielzeug/deposit';

type CacheEntry = { id: string; value: string };
const schema = { cache: table<CacheEntry>('id') };

const db = createLocalStorage({ dbName: 'cache', schema });
await db.put('cache', { id: 'k1', value: 'payload' }, ttl.seconds(30));
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

const db = createIndexedDB({
  dbName: 'blog',
  migrate,
  schema,
  schemaVersion: 2,
});
```

## Testing with the Memory Adapter

Swap any adapter for `createMemory` in test setup — no browser APIs, no cleanup boilerplate, TTL-accurate.

```ts
import { createMemory } from '@vielzeug/deposit';
import { schema } from '../src/schema';

describe('user repository', () => {
  let db: ReturnType<typeof createMemory<typeof schema>>;

  beforeEach(() => {
    // A fresh isolated store for every test — no shared state.
    db = createMemory({ schema });
  });

  test('can check existence without fetching the full record', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 99)).toBe(false);
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
