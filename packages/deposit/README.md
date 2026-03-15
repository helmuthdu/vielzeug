# @vielzeug/deposit

> Schema-driven browser storage with a fluent query builder for IndexedDB and LocalStorage

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Deposit** is a schema-driven storage library for the browser: define typed tables, persist records to IndexedDB or LocalStorage via dedicated factory functions, and query results with a fluent builder — without writing a single raw database call.

## Installation

```sh
pnpm add @vielzeug/deposit
# npm install @vielzeug/deposit
# yarn add @vielzeug/deposit
```

## Quick Start

```typescript
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';

interface User {
  id: number;
  name: string;
  age: number;
}

const schema = defineSchema<{ users: User }>({ users: { key: 'id' } });
const db = createLocalStorage({ dbName: 'my-app', schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 });

const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
const alice = await db.get('users', 1);
```

## Features

- ✅ **Schema-driven** — `defineSchema()` types every table, key, and query result
- ✅ **Two adapters** — `createLocalStorage()` and `createIndexedDB()` share an identical `Adapter` interface
- ✅ **Inline schemas** — pass the schema directly without a separate `defineSchema` variable
- ✅ **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `and`, `or`, `search`, `contains`, `orderBy`, `limit`, `offset`, `page`, `map`, and more
- ✅ **`for await...of`** — `QueryBuilder` implements `AsyncIterator`
- ✅ **TTL** — per-record expiry via optional `ttl` (ms) on `put`, `putMany`, and `getOrPut`; use the `ttl` helper for readable durations
- ✅ **`patch` returns merged record** — no follow-up `get` needed after a partial update
- ✅ **`getMany`** — batch fetch by a list of keys in a single operation
- ✅ **Transactions** — atomic multi-table writes with the full method set (IndexedDB only)
- ✅ **Bulk operations** — `putMany` and `deleteMany` for operating on multiple records at once
- ✅ **`storeField()`** — migration helper that encapsulates deposit's internal key-path convention
- ✅ **Utility types** — `RecordOf<S, K>` and `KeyOf<S, K>` for typed schema access
- ✅ **Zero dependencies** — tiny bundle, no supply chain risk

## Usage

### Defining a Schema

```typescript
import { defineSchema } from '@vielzeug/deposit';

interface Post {
  id: number;
  title: string;
  authorId: number;
  publishedAt: number;
}
interface Comment {
  id: number;
  postId: number;
  body: string;
}

const schema = defineSchema<{ posts: Post; comments: Comment }>({
  posts: { key: 'id', indexes: ['authorId', 'publishedAt'] },
  comments: { key: 'id', indexes: ['postId'] },
});
```

Or inline — no separate variable needed:

```typescript
const db = createIndexedDB<{ users: User }>({
  dbName: 'my-app',
  version: 1,
  schema: { users: { key: 'id' } },
});
```

### Creating an Adapter

```typescript
import { createLocalStorage, createIndexedDB } from '@vielzeug/deposit';

// LocalStorage — simple, ~5–10 MB limit
const db = createLocalStorage({ dbName: 'my-app', schema });

// IndexedDB — larger storage, supports migrations and transactions
const db = createIndexedDB({
  dbName: 'my-app',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx) => {
    /* ... */
  },
});
```

### CRUD

```typescript
// Upsert
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 1, name: 'Alice', age: 30 }, 3_600_000); // with TTL

// Get by key
const user = await db.get('users', 1); // User | undefined
const user = await db.getOr('users', 1, defaultUser); // User (never undefined)

// Batch fetch by key list
const users = await db.getMany('users', [1, 2, 5]); // User[]

// Get all
const all = await db.getAll('users');

// Partial update — returns merged record, or undefined when key absent
const updated = await db.patch('users', 1, { age: 31 });

// Delete
await db.delete('users', 1); // single key
await db.deleteMany('users', [1, 2, 3]); // multiple keys
await db.deleteAll('users');

// Existence and count
const exists = await db.has('users', 1);
const total = await db.count('users');

// Cache pattern
const user = await db.getOrPut('users', 1, () => fetchUser(1), ttl.minutes(5));
```

### Bulk Operations

```typescript
await db.putMany('users', [user1, user2, user3]);
await db.putMany('sessions', sessions, ttl.hours(1)); // TTL applied to all
await db.deleteMany('users', [1, 2, 3]);
```

### TTL Helper

The `ttl` export helps express durations without hard-coding raw millisecond literals:

```typescript
import { ttl } from '@vielzeug/deposit';

await db.put('sessions', session, ttl.hours(1)); // 3_600_000 ms
await db.put('cache', entry, ttl.minutes(15)); // 900_000 ms
await db.put('tokens', token, ttl.seconds(30)); // 30_000 ms
await db.put('events', event, ttl.ms(500)); // 500 ms
```

### Query Builder

```typescript
const qb = db.from('users');

// Filtering
await qb.equals('city', 'Paris').toArray();
await qb.between('age', 18, 30).toArray();
await qb.startsWith('name', 'ali', true).toArray(); // case-insensitive
await qb.filter((u) => u.age > 18).toArray();
await qb
  .and(
    (u) => u.city === 'Paris',
    (u) => u.age > 25,
  )
  .toArray();
await qb
  .or(
    (u) => u.city === 'Paris',
    (u) => u.city === 'Berlin',
  )
  .toArray();

// Search
await qb.search('alice').toArray(); // fuzzy, all fields
await qb.contains('ali', ['name']).toArray(); // substring on named fields
await qb.contains('paris').toArray(); // substring on all string fields

// Sorting & pagination
await qb.orderBy('age', 'desc').limit(10).toArray();
await qb.orderBy('name').page(2, 20).toArray();
await qb.reverse().toArray();

// Projection — map returns ProjectedQuery<U>, so primitives work too
const names = await qb.map((u) => u.name).toArray(); // string[]
const dtos = await qb.map((u) => ({ id: u.id })).toArray(); // { id: number }[]
// Reduce
const totalAge = await qb.reduce((sum, u) => sum + u.age, 0);
// Terminals
const first = await qb.orderBy('age').first();
const last = await qb.orderBy('age').last();
// Note: count() applies after limit/offset — call count() before pagination for a total
const count = await qb.equals('city', 'Paris').count();

// Async iteration
for await (const user of db.from('users').orderBy('name')) {
  console.log(user.name);
}
```

### Transactions (IndexedDB only)

```typescript
const db = createIndexedDB({ dbName: 'my-app', version: 1, schema });

await db.transaction(['posts', 'comments'], async (tx) => {
  await tx.put('posts', { id: 1, title: 'Hello', authorId: 1, publishedAt: Date.now() });
  await tx.put('comments', { id: 1, postId: 1, body: 'First comment!' });
  await tx.patch('posts', 1, { title: 'Hello, World!' });
  await tx.delete('posts', 99);
  await tx.putMany('comments', [c1, c2]);
  const exists = await tx.has('comments', 1);
  const total = await tx.count('posts');
  const recent = await tx.from('posts').orderBy('publishedAt', 'desc').limit(5).toArray();
  // All writes commit atomically — any throw rolls everything back
});

// Close the connection when done
db.close();
```

### Schema Migrations (IndexedDB)

```typescript
import type { MigrationFn } from '@vielzeug/deposit';
import { storeField } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, newVersion, tx) => {
  if (oldVersion < 2) {
    const store = tx.objectStore('users');
    // Use storeField() instead of hard-coding 'v.email' — stays correct if deposit's
    // internal envelope format ever changes.
    store.createIndex('email', storeField('email'), { unique: true });
  }
};

const db = createIndexedDB({ dbName: 'my-app', version: 2, schema, migrationFn });
```

## API

### Factory Functions

| Export                        | Returns                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `createLocalStorage(options)` | `Adapter<Schema<S>>`                                       |
| `createIndexedDB(options)`    | `IndexedDBHandle<Schema<S>>`                               |
| `defineSchema<S>(schema)`     | `Schema<S>`                                                |
| `storeField(field)`           | `string` — IDB key path for a record field (e.g. `'v.id'`) |
| `ttl`                         | `{ ms, seconds, minutes, hours }` — TTL duration helpers   |

### `Adapter<S>` Methods

| Method                                | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `get(table, key)`                     | Get record by key; returns `undefined` if missing or expired          |
| `getOr(table, key, default)`          | Get record by key; returns `default` when missing (never `undefined`) |
| `getAll(table)`                       | Get all live records                                                  |
| `getMany(table, keys[])`              | Batch fetch by key list, omitting misses                              |
| `put(table, value, ttl?)`             | Upsert a single record                                                |
| `putMany(table, values[], ttl?)`      | Upsert multiple records (TTL applied to all)                          |
| `patch(table, key, partial)`          | Partial update — returns merged record or `undefined`                 |
| `delete(table, key)`                  | Delete a single record by key                                         |
| `deleteMany(table, keys[])`           | Delete multiple records by key list                                   |
| `deleteAll(table)`                    | Remove all records in a table                                         |
| `has(table, key)`                     | Check existence (respects TTL)                                        |
| `count(table)`                        | Count live records                                                    |
| `getOrPut(table, key, factory, ttl?)` | Get cached or create via factory                                      |
| `from(table)`                         | Create a lazy `QueryBuilder`                                          |

### `IndexedDBHandle<S>` (extends `Adapter<S>`)

| Method                    | Description                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction(tables, fn)` | Atomic multi-table write; `fn` receives `TransactionContext` with all read/write methods except `getOrPut`. Commits on resolve, rolls back on throw. |
| `close()`                 | Close the IDB connection                                                                                                                             |

### `QueryBuilder<T>` Methods

| Method                                   | Description                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `equals(field, value)`                   | Strict equality filter                                                         |
| `between(field, lower, upper)`           | Inclusive range filter                                                         |
| `startsWith(field, prefix, ignoreCase?)` | Prefix filter                                                                  |
| `filter(fn)`                             | Custom predicate                                                               |
| `and(...predicates)`                     | All predicates must match                                                      |
| `or(...predicates)`                      | Any predicate must match                                                       |
| `orderBy(field, direction?)`             | Sort (`'asc'` \| `'desc'`, default `'asc'`)                                    |
| `limit(n)`                               | Take first _n_ records                                                         |
| `offset(n)`                              | Skip first _n_ records                                                         |
| `page(pageNumber, pageSize)`             | Slice by page number                                                           |
| `reverse()`                              | Reverse result order                                                           |
| `map(fn)`                                | Project each record — returns `ProjectedQuery<U>` (supports primitive types)   |
| `search(query, tone?)`                   | Fuzzy full-text search; `tone` ∈ [0,1], lower = more permissive (default 0.25) |
| `contains(query, fields?)`               | Case-insensitive substring match; all string fields when `fields` omitted      |
| `reduce(fn, initial)`                    | Reduce all matching records to a single value                                  |
| `toArray()`                              | Execute and return `T[]`                                                       |
| `first()`                                | First record or `undefined`                                                    |
| `last()`                                 | Last record or `undefined`                                                     |
| `count()`                                | Count matching records (applied after `limit`/`offset`/`page`)                 |
| `[Symbol.asyncIterator]()`               | Enable `for await...of` iteration                                              |

## Documentation

Full docs at **[vielzeug.dev/deposit](https://vielzeug.dev/deposit)**

|                                                   |                                              |
| ------------------------------------------------- | -------------------------------------------- |
| [Usage Guide](https://vielzeug.dev/deposit/usage) | Schema, CRUD, queries, TTL, and transactions |
| [API Reference](https://vielzeug.dev/deposit/api) | Complete type signatures                     |
| [Examples](https://vielzeug.dev/deposit/examples) | Real-world storage patterns                  |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
