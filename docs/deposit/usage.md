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

`table<T>()` infers record and key types from your schema.

## Create an Adapter

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const local = createLocalStorage({
  name: 'app',
  schema,
});
```

### SessionStorage

```ts
import { createSessionStorage } from '@vielzeug/deposit';

const session = createSessionStorage({
  name: 'app',
  schema,
});
```

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const idb = createIndexedDB({
  name: 'app',
  schema,
  version: 1,
});
```

### Memory

```ts
import { createMemory } from '@vielzeug/deposit';

const mem = createMemory({ schema });
```

## Basic CRUD

```ts
await idb.put('users', { id: 1, name: 'Alice', age: 30 });

const one = await idb.get('users', 1);
const all = await idb.getAll('users');
const exists = await idb.has('users', 1);

await idb.update('users', 1, { age: 31 });
await idb.delete('users', 1);
await idb.deleteAll('users');

void one;
void all;
void exists;
```

## Use TTL

```ts
import { ttl } from '@vielzeug/deposit';

await idb.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));
await idb.put('cache', { id: 1, value: 'data' }, 5000);
```

TTL accepts plain numbers (milliseconds) and `ttl.*` helpers.

## Query Data

```ts
const result = await local
  .query('users')
  .between('age', 18, 99)
  .startsWith('name', 'a', { ignoreCase: true })
  .orderBy('name', 'asc')
  .limit(20)
  .offset(0)
  .toArray();

const first = await local.query('users').orderBy('age', 'asc').first();
const count = await local.query('users').equals('age', 30).count();

void result;
void first;
void count;
```

### Delete via Query

```ts
const deleted = await local.query('users').filter((u) => u.age < 18).delete();

void deleted;
```

## Reactive Reads

`observe(table, listener, options?)` emits an async initial snapshot by default.

```ts
const stop = idb.observe('users', (rows) => {
  console.log('users changed', rows);
});

// Skip the initial snapshot when you only care about future changes:
const stopWithoutInitial = idb.observe('users', console.log, { initialEmit: false });

await idb.put('users', { id: 1, name: 'Alice', age: 30 });

stop();
stopWithoutInitial();
```

## Run IndexedDB Transactions

```ts
await idb.transaction(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice', age: 30 });
  await tx.put('posts', { id: 1, title: 'Hello', userId: 1 });

  await tx.query('posts').filter((post) => post.title.startsWith('H')).delete();
});
```

If the callback throws, the transaction is aborted and rolled back.

## Handle Schema Migrations

```ts
import { createIndexedDB, type MigrationFn } from '@vielzeug/deposit';

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({
  name: 'app',
  schema,
  version: 2,
  migrate,
});

void db;
```

## Environment-Based Adapter Selection

```ts
import {
  createIndexedDB,
  createLocalStorage,
  createMemory,
  createSessionStorage,
  type Adapter,
} from '@vielzeug/deposit';

function createStorage(): Adapter<typeof schema> {
  if (typeof indexedDB !== 'undefined') {
    return createIndexedDB({ name: 'app', schema, version: 1 });
  }

  if (typeof localStorage !== 'undefined') {
    return createLocalStorage({ name: 'app', schema });
  }

  if (typeof sessionStorage !== 'undefined') {
    return createSessionStorage({ name: 'app', schema });
  }

  return createMemory({ schema });
}
```

## Best Practices

- Prefer `createIndexedDB` for large data or transactional flows.
- Use `createMemory` in tests and non-browser environments.
- Unsubscribe `observe()` listeners on teardown.
- Keep transaction callbacks focused on storage operations.
- Use query operators for reads and `query.delete()` for predicate-based deletes.
