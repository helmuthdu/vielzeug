---
title: Deposit — Usage Guide
description: How to use deposit with a compact, typed API.
---

[[toc]]

## Define a Schema

```ts
import { type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

type AppSchema = { users: User };

const schema: Schema<AppSchema> = {
  users: { key: 'id' },
};
```

## Create an Adapter

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const local = createLocalStorage({ dbName: 'app', schema });
```

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const idb = createIndexedDB({ dbName: 'app', version: 1, schema });
```

## Basic CRUD

```ts
await idb.put('users', { id: 1, name: 'Alice', age: 30 });

const one = await idb.get('users', 1);
const all = await idb.getAll('users');

await idb.delete('users', 1);
await idb.deleteAll('users');

const total = await idb.count('users');
```

## Use TTL

```ts
import { ttl } from '@vielzeug/deposit';

await idb.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));
```

## Query Data

```ts
const result = await local
  .from('users')
  .between('age', 18, 99)
  .startsWith('name', 'a', { ignoreCase: true })
  .orderBy('name', 'asc')
  .limit(20)
  .offset(0)
  .toArray();

const count = await local.from('users').equals('age', 30).count();
```

## Run IndexedDB Transactions

```ts
await idb.transaction(['users'], async (tx) => {
  await tx.put('users', { id: 2, name: 'Bob', age: 28 });
  await tx.delete('users', 1);

  const current = await tx.getAll('users');
  const n = await tx.count('users');

  void current;
  void n;
});
```

## Handle Schema Migrations

```ts
import { createIndexedDB, type MigrationFn } from '@vielzeug/deposit';

const migrationFn: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    // Example: add an index during upgrade.
    tx.objectStore('users').createIndex('name', 'v.name', { unique: false });
  }
};

const db = createIndexedDB({
  dbName: 'app',
  migrationFn,
  schema,
  version: 2,
});
```

## Operational Notes

- `count()` returns live records (TTL-expired records are excluded).
- Query operations run in memory over records returned from the backend.
- Keep transaction callbacks focused on DB operations for predictable atomicity.
- Call `close()` on IndexedDB handles in long-lived contexts when shutting down.
