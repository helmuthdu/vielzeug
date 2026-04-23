---
title: Deposit Examples — Advanced
description: Transaction and migration patterns for advanced deposit usage.
---

## Atomic Multi-Table Transaction

```ts
import { createIndexedDB, type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string };
type Post = { id: number; title: string; userId: number };

const schema: Schema<{ users: User; posts: Post }> = {
  users: { key: 'id' },
  posts: { key: 'id' },
};

const db = createIndexedDB({ dbName: 'blog', version: 1, schema });

await db.transaction(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' });
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 });
});
```

## Transaction Rollback on Error

```ts
await db.put('users', { id: 2, name: 'Bob' });

await db.transaction(['users'], async (tx) => {
  await tx.delete('users', 2);
  throw new Error('abort transaction');
});

// Bob still exists because the transaction was aborted.
const bob = await db.get('users', 2);
```

## TTL Cache Entry

```ts
import { createLocalStorage, ttl, type Schema } from '@vielzeug/deposit';

type CacheEntry = { id: string; value: string };
const schema: Schema<{ cache: CacheEntry }> = { cache: { key: 'id' } };

const db = createLocalStorage({ dbName: 'cache', schema });
await db.put('cache', { id: 'k1', value: 'payload' }, ttl.seconds(30));
```

## IndexedDB Migration Hook

```ts
import { createIndexedDB, type MigrationFn, type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema: Schema<{ users: User }> = { users: { key: 'id' } };

const migrationFn: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'v.name', { unique: false });
  }
};

const db = createIndexedDB({
  dbName: 'blog',
  migrationFn,
  schema,
  version: 2,
});

void db;
```
