# @vielzeug/deposit

> Minimal typed browser storage with LocalStorage, SessionStorage, Cookie, IndexedDB, and in-memory backends.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/deposit` is a small schema-typed storage layer for browser apps. It intentionally keeps the API compact: core CRUD, a lightweight query API, TTL support, and atomic IndexedDB transactions.

## Installation

```sh
pnpm add @vielzeug/deposit
```

## Quick Start

```ts
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema = {
  users: table<User>('id'),
};

const db = createIndexedDB({ dbName: 'my-app', schema, schemaVersion: 1 });

await db.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

const first = await db.query('users').between('age', 18, 99).orderBy('name').first();
const exists = await db.has('users', 1);
```

## Why Deposit?

- One typed interface for LocalStorage, SessionStorage, Cookie, IndexedDB, and in-memory
- `table<T>()` schema factory — no schema type annotations
- Compact query API for common filtering/sorting/pagination
- TTL on writes with lazy expiration
- Atomic IndexedDB transactions for multi-step writes
- In-memory adapter for tests and SSR environments

## API

### Factories

- `createLocalStorage(options)`
- `createSessionStorage(options)`
- `createCookie(options)`
- `createIndexedDB(options)`
- `createMemory(options)`

### Schema helper

- `table<T>(key)` — creates a typed schema entry

### Adapter methods

- `get(table, key)`
- `getAll(table)`
- `forEach(table, fn)`
- `has(table, key)`
- `getOrPut(table, key, fallback, ttl?)`
- `put(table, value, ttl?)`
- `putAll(table, values, ttl?)`
- `update(table, key, changes, ttl?)`
- `delete(table, key)`
- `deleteWhere(table, predicate)`
- `deleteAll(table)`
- `count(table)`
- `query(table)`
- `observe(table, listener)`

### IndexedDB-only

- `transaction(tables, fn)`
- `close()`

### Transaction context methods

- `get`, `getAll`, `forEach`, `has`, `getOrPut`, `put`, `putAll`, `update`, `delete`, `deleteWhere`, `deleteAll`, `count`, `query`

### QueryBuilder methods

- `filter(fn)`
- `equals(field, value)`
- `between(field, lower, upper)`
- `startsWith(field, prefix, options?)`
- `orderBy(field, direction?)`
- `limit(n)`
- `offset(n)`
- `toArray()`
- `count()` (ignores `limit()` and `offset()`)
- `first()`

### TTL helper

```ts
import { ttl } from '@vielzeug/deposit';

await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
```

## Usage Notes

- Schema objects only declare the key field per table (`{ key: 'id' }`).
- `count()` is TTL-aware and excludes expired records.
- `createCookie()` is browser-only and best for small persisted state that should travel with requests.
- `createLocalStorage`, `createSessionStorage`, and `createMemory` do not expose transactions.
- Query operations run in memory on fetched table records.
- `QueryBuilder.count()` ignores pagination and returns the full number of matching records.
- `observe(table, listener)` emits an immediate snapshot, then updates after table mutations.
- IndexedDB observers propagate across tabs/windows via `BroadcastChannel` when available.

## IndexedDB Transactions

```ts
const updatedUser = await db.transaction(['users'] as const, async (tx) => {
  const user = await tx.get('users', 1);

  if (!user) throw new Error('Missing user');

  await tx.put('users', { id: 3, name: 'Charlie', age: 32 });
  await tx.delete('users', 1);

  return user;
});
```

## Documentation

- [Usage Guide](https://vielzeug.dev/deposit/usage)
- [API Reference](https://vielzeug.dev/deposit/api)
- [Examples](https://vielzeug.dev/deposit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)
