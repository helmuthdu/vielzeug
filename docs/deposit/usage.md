---
title: Deposit — Usage Guide
description: Practical patterns for using Deposit with LocalStorage, SessionStorage, IndexedDB, and Memory.
---

::: tip New to Deposit?
Start with the [Overview](./index.md) for installation and quick context, then use this page for end-to-end usage patterns.
:::

# Deposit Usage Guide

[[toc]]

## Define a Schema

The `table<T>()` factory creates a typed schema entry. Pass the record type as a generic and the primary key field name as the argument.

```ts
import { table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};
```

Record and key types are inferred from `table<T>()`. `typeof schema` serves as the schema type wherever needed.

## Create an Adapter

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const local = createLocalStorage({ dbName: 'app', schema });
```

Use this adapter for simple browser persistence where transactional behavior is not required.

### SessionStorage

```ts
import { createSessionStorage } from '@vielzeug/deposit';

const session = createSessionStorage({ dbName: 'app', schema });
```

Use this adapter for tab-scoped persistence that resets when the tab or window closes.

### Cookie

```ts
import { createCookie } from '@vielzeug/deposit';

const cookie = createCookie({
  dbName: 'app',
  path: '/',
  sameSite: 'Strict',
  schema,
});
```

Use this adapter for small browser state that should be available through cookies. It is browser-only, so it is a good fit when you want persistence without relying on Web Storage APIs.

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const idb = createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });
```

Use this adapter when you need atomic transactions or larger datasets.

### Memory

```ts
import { createMemory } from '@vielzeug/deposit';

const mem = createMemory({ schema });
```

Use this adapter in tests, SSR environments, or wherever browser storage APIs are unavailable. Each `createMemory()` call returns a fully isolated instance — no `dbName` is needed. The interface is identical to the browser adapters.

## Basic CRUD

```ts
await idb.put('users', { id: 1, name: 'Alice', age: 30 });

const one = await idb.get('users', 1);
const all = await idb.getAll('users');

await idb.delete('users', 1);
await idb.deleteAll('users');

const total = await idb.count('users');
```

`count()` reflects live records and excludes TTL-expired entries.

### Existence check

`has()` returns `true` if a live record exists for the given key, without loading the full record.

```ts
const exists = await idb.has('users', 1); // true
const missing = await idb.has('users', 99); // false
```

### Bulk writes

`putAll()` writes multiple records in a single operation. In IndexedDB this runs as one atomic transaction.

```ts
await idb.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

// With TTL
await idb.putAll('sessions', sessions, ttl.hours(1));
```

## Use TTL

```ts
import { ttl } from '@vielzeug/deposit';

await idb.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));

await idb.put('users', { id: 2, name: 'Bob', age: 28 }, ttl.hours(1));
```

Available helpers: `ttl.ms`, `ttl.seconds`, `ttl.minutes`, `ttl.hours`, `ttl.days`.

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

const count = await local.query('users').equals('age', 30).count();
```

Queries are composed lazily and run when `toArray()`, `count()`, or `first()` is called.

### Get the first result

`first()` resolves after applying all preceding operators, returning the first match or `undefined`.

```ts
const youngest = await local
  .query('users')
  .orderBy('age', 'asc')
  .first();
```

## Reactive Reads

`observe(table, listener)` emits the current snapshot immediately and then emits again after table mutations.

```ts
const stop = idb.observe('users', (rows) => {
  console.log('users changed', rows);
});

await idb.put('users', { id: 1, name: 'Alice', age: 30 });
stop();
```

IndexedDB observers propagate across tabs/windows via `BroadcastChannel` when available. LocalStorage observers also react to cross-tab writes via the browser `storage` event.

## Update and Upsert-Like Helpers

```ts
await idb.update('users', 1, { age: 31 });

const user = await idb.getOrPut('users', 2, () => ({
  id: 2,
  name: 'Bob',
  age: 26,
}));

const removed = await idb.deleteWhere('users', (value) => value.age < 21);

await idb.forEach('users', (value) => {
  console.log(value.name);
});

void user;
void removed;
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

If the callback throws, the transaction is aborted and changes are rolled back.

## Handle Schema Migrations

```ts
import { createIndexedDB, type MigrationFn } from '@vielzeug/deposit';

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    // Example: add an index during upgrade.
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({
  dbName: 'app',
  migrate,
  schema,
  schemaVersion: 2,
});
```

Increase `schemaVersion` to trigger `migrate` during `onupgradeneeded`.

## Operational Notes

- `count()` returns live records (TTL-expired records are excluded).
- Query operations run in memory over records returned from the backend.
- Keep transaction callbacks focused on DB operations for predictable atomicity.
- Call `close()` on IndexedDB handles in long-lived contexts when shutting down.
- `createMemory()` state is scoped to the instance; each call returns an isolated store.
- `createSessionStorage()` is tab-scoped and clears when the tab/window is closed.
- `observe()` emits an immediate snapshot first; unsubscribe when no longer needed.

## Testing with the Memory Adapter

Swap any adapter for `createMemory` in test setup to get a browser-free, zero-teardown store:

```ts
import { createMemory } from '@vielzeug/deposit';
import { schema } from '../src/schema';

// No localStorage mocks, no fake-indexeddb — just a plain Map under the hood.
const db = createMemory({ schema });

beforeEach(() => db.deleteAll('users'));

test('creates a user', async () => {
  await db.put('users', { id: 1, name: 'Alice', age: 30 });
  expect(await db.has('users', 1)).toBe(true);
});
```

The memory adapter is TTL-accurate: records expire lazily on read, just like the other adapters.

## Common Pattern: Swap Adapters by Environment

```ts
import {
  createCookie,
  createIndexedDB,
  createLocalStorage,
  createMemory,
  createSessionStorage,
  type Adapter,
} from '@vielzeug/deposit';
import { schema } from './schema';

function createStorage(): Adapter<typeof schema> {
  if (typeof indexedDB !== 'undefined') {
    return createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });
  }

  if (typeof localStorage !== 'undefined') {
    return createLocalStorage({ dbName: 'app', schema });
  }

  if (typeof sessionStorage !== 'undefined') {
    return createSessionStorage({ dbName: 'app', schema });
  }

  if (typeof document !== 'undefined') {
    return createCookie({ dbName: 'app', schema });
  }

  // SSR or test environment
  return createMemory({ schema });
}
```
