# @vielzeug/deposit

> Minimal typed browser storage with LocalStorage, SessionStorage, Cookie, IndexedDB, and in-memory backends.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/deposit` is a small schema-typed storage layer for browser apps. It intentionally keeps the API compact: core CRUD, a lightweight query builder, TTL support, and atomic IndexedDB transactions.

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

const db = createIndexedDB({ dbName: 'my-app', version: 1, schema });

await db.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

const first = await db.from('users').between('age', 18, 99).orderBy('name').first();
const exists = await db.has('users', 1);
```

## Why Deposit?

- One typed interface for LocalStorage, SessionStorage, Cookie, IndexedDB, and in-memory
- `table<T>()` schema factory — no boilerplate type annotations
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

`createCookie(options)` supports:

- `dbName` (required)
- `schema` (required)
- `path` (default `'/'`)
- `sameSite` (default `'Strict'`)
- `secure` (default `false`)

### Schema helper

- `table<T>(key)` — creates a typed schema entry

### Adapter methods

- `get(table, key)`
- `getAll(table)`
- `has(table, key)`
- `put(table, value, ttl?)`
- `putAll(table, values, ttl?)`
- `delete(table, key)`
- `deleteAll(table)`
- `count(table)`
- `from(table)`

### IndexedDB-only

- `transaction(tables, fn)`
- `close()`

### Transaction context methods

- `get`, `getAll`, `has`, `put`, `putAll`, `delete`, `deleteAll`, `count`, `from`

### QueryBuilder methods

- `filter(fn)`
- `equals(field, value)`
- `between(field, lower, upper)`
- `startsWith(field, prefix, options?)`
- `orderBy(field, direction?)`
- `limit(n)`
- `offset(n)`
- `toArray()`
- `count()`
- `first()`

### TTL helper

```ts
import { ttl } from '@vielzeug/deposit';

await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
```

## Usage Notes

- `Schema` only declares the key field per table (`{ key: 'id' }`).
- `count()` is TTL-aware and excludes expired records.
- LocalStorage, SessionStorage, Cookie, and Memory adapters do not expose transactions.
- Cookie adapter is browser-only (`document.cookie`) and is best for small values.
- Cookie TTL is evaluated lazily on read (`get`/`getAll`/`has`/`count`), then cleaned up.
- Query operations run in memory on fetched table records.

## IndexedDB Transactions

```ts
await db.transaction(['users'], async (tx) => {
  await tx.put('users', { id: 3, name: 'Charlie', age: 32 });
  await tx.delete('users', 1);
});
```

## Documentation

- [Usage Guide](https://vielzeug.dev/deposit/usage)
- [API Reference](https://vielzeug.dev/deposit/api)
- [Examples](https://vielzeug.dev/deposit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)
