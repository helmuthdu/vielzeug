# @vielzeug/deposit

> Minimal typed browser storage with IndexedDB and LocalStorage backends.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/deposit` is a small schema-typed storage layer for browser apps. It intentionally keeps the API compact: core CRUD, a lightweight query builder, TTL support, and atomic IndexedDB transactions.

## Installation

```sh
pnpm add @vielzeug/deposit
```

## Quick Start

```ts
import { createLocalStorage, type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema: Schema<{ users: User }> = {
  users: { key: 'id' },
};

const db = createLocalStorage({ dbName: 'my-app', schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 });

const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
```

## Why Deposit?

- One typed interface for both LocalStorage and IndexedDB
- Explicit schema keys per table (`Schema<S>`)
- Compact query API for common filtering/sorting/pagination
- TTL on writes with lazy expiration
- Atomic IndexedDB transactions for multi-step writes

## API

### Factories

- `createLocalStorage(options)`
- `createIndexedDB(options)`

### Adapter methods

- `get(table, key)`
- `getAll(table)`
- `put(table, value, ttl?)`
- `delete(table, key)`
- `deleteAll(table)`
- `count(table)`
- `from(table)`

### IndexedDB-only

- `transaction(tables, fn)`
- `close()`

### Transaction context methods

- `get(table, key)`
- `getAll(table)`
- `put(table, value, ttl?)`
- `delete(table, key)`
- `deleteAll(table)`
- `count(table)`
- `from(table)`

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

### TTL helper

```ts
import { ttl } from '@vielzeug/deposit';

await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
```

## Usage Notes

- `Schema` only declares the key field per table (`{ key: 'id' }`).
- `count()` is TTL-aware and excludes expired records.
- LocalStorage has no transaction API.
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
