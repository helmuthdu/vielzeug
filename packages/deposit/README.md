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

interface User { id: number; name: string; age: number }

const schema = defineSchema<{ users: User }>({ users: { key: 'id' } });
const db = createLocalStorage({ dbName: 'my-app', schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 });

const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
const alice  = await db.get('users', 1);
```

## Features

- ✅ **Schema-driven** — `defineSchema()` types every table, key, and query result
- ✅ **Two adapters** — `createLocalStorage()` and `createIndexedDB()` share an identical `Adapter` interface
- ✅ **Inline schemas** — pass the schema directly without a separate `defineSchema` variable
- ✅ **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `and`, `or`, `search`, `contains`, `orderBy`, `limit`, `offset`, `page`, `map`, and more
- ✅ **`for await...of`** — `QueryBuilder` implements `AsyncIterator`
- ✅ **TTL** — per-record expiry via optional `ttl` (milliseconds) on `put` and `getOrPut`
- ✅ **`patch` returns merged record** — no follow-up `get` needed after a partial update
- ✅ **`getMany`** — batch fetch by a list of keys in a single operation
- ✅ **Transactions** — atomic multi-table writes with `get`, `put`, `patch`, and `delete` (IndexedDB only)
- ✅ **Bulk operations** — `put` and `delete` accept a single value or an array
- ✅ **Zero dependencies** — tiny bundle, no supply chain risk

## Usage

### Defining a Schema

```typescript
import { defineSchema } from '@vielzeug/deposit';

interface Post    { id: number; title: string; authorId: number; publishedAt: number }
interface Comment { id: number; postId: number; body: string }

const schema = defineSchema<{ posts: Post; comments: Comment }>({
  posts:    { key: 'id', indexes: ['authorId', 'publishedAt'] },
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
  migrationFn: (db, oldVersion, newVersion, tx) => { /* ... */ },
});
```

### CRUD

```typescript
// Upsert
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 1, name: 'Alice', age: 30 }, 3_600_000); // with TTL

// Get by key
const user = await db.get('users', 1);                  // User | undefined
const user = await db.get('users', 1, defaultUser);     // User (never undefined)

// Batch fetch by key list
const users = await db.getMany('users', [1, 2, 5]);     // User[]

// Get all
const all = await db.getAll('users');

// Partial update — returns merged record, or undefined when key absent
const updated = await db.patch('users', 1, { age: 31 });

// Delete
await db.delete('users', 1);
await db.deleteAll('users');

// Existence and count
const exists = await db.has('users', 1);
const total  = await db.count('users');

// Cache pattern
const user = await db.getOrPut('users', 1, () => fetchUser(1), 60_000);
```

### Bulk Operations

```typescript
await db.put('users', [user1, user2, user3]);
await db.put('sessions', sessions, 3_600_000); // TTL applied to all
await db.delete('users', [1, 2, 3]);
```

### Query Builder

```typescript
const qb = db.from('users');

// Filtering
await qb.equals('city', 'Paris').toArray();
await qb.between('age', 18, 30).toArray();
await qb.startsWith('name', 'ali', true).toArray();    // case-insensitive
await qb.filter(u => u.age > 18).toArray();
await qb.and(u => u.city === 'Paris', u => u.age > 25).toArray();
await qb.or(u => u.city === 'Paris', u => u.city === 'Berlin').toArray();

// Search
await qb.search('alice').toArray();                    // fuzzy, all fields
await qb.contains('ali', ['name']).toArray();          // substring on named fields
await qb.contains('paris').toArray();                  // substring on all string fields

// Sorting & pagination
await qb.orderBy('age', 'desc').limit(10).toArray();
await qb.orderBy('name').page(2, 20).toArray();
await qb.reverse().toArray();

// Projection
const names = await qb.map(u => u.name).toArray();

// Terminals
const first = await qb.orderBy('age').first();
const last  = await qb.orderBy('age').last();
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
  // All writes commit atomically — any throw rolls everything back
});

// Close the connection when done
db.close();
```

### Schema Migrations (IndexedDB)

```typescript
import type { MigrationFn } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, newVersion, tx) => {
  if (oldVersion < 2) {
    const store = tx.objectStore('users');
    store.createIndex('email', 'v.email', { unique: true });
  }
};

const db = createIndexedDB({ dbName: 'my-app', version: 2, schema, migrationFn });
```

## API

### Factory Functions

| Export | Returns |
|---|---|
| `createLocalStorage(options)` | `Adapter<Schema<S>>` |
| `createIndexedDB(options)` | `IndexedDBHandle<Schema<S>>` |
| `defineSchema<S>(schema)` | `Schema<S>` |

### `Adapter<S>` Methods

| Method | Description |
|---|---|
| `get(table, key, default?)` | Get record by key; typed non-nullable when default is provided |
| `getAll(table)` | Get all live records |
| `getMany(table, keys[])` | Batch fetch by key list, omitting misses |
| `put(table, value, ttl?)` | Upsert one or many records |
| `patch(table, key, partial)` | Partial update — returns merged record or `undefined` |
| `delete(table, key)` | Delete one or many records |
| `deleteAll(table)` | Remove all records in a table |
| `has(table, key)` | Check existence (respects TTL) |
| `count(table)` | Count live records |
| `getOrPut(table, key, factory, ttl?)` | Get cached or create via factory |
| `from(table)` | Create a lazy `QueryBuilder` |

### `IndexedDBHandle<S>` (extends `Adapter<S>`)

| Method | Description |
|---|---|
| `transaction(tables, fn)` | Atomic multi-table write; `fn` receives `get`, `getAll`, `put`, `patch`, `delete` |
| `close()` | Close the IDB connection |

### `QueryBuilder<T>` Methods

| Method | Description |
|---|---|
| `equals(field, value)` | Strict equality filter |
| `between(field, lower, upper)` | Inclusive range filter |
| `startsWith(field, prefix, ignoreCase?)` | Prefix filter |
| `filter(fn)` | Custom predicate |
| `and(...predicates)` | All predicates must match |
| `or(...predicates)` | Any predicate must match |
| `orderBy(field, direction?)` | Sort (`'asc'` \| `'desc'`, default `'asc'`) |
| `limit(n)` | Take first *n* records |
| `offset(n)` | Skip first *n* records |
| `page(pageNumber, pageSize)` | Slice by page number |
| `reverse()` | Reverse result order |
| `map(fn)` | Project to a new type (`QueryBuilder<U>`) |
| `search(query, tone?)` | Fuzzy full-text search across all fields |
| `contains(query, fields?)` | Case-insensitive substring match; all string fields when `fields` omitted |
| `toArray()` | Execute and return `T[]` |
| `first()` | First record or `undefined` |
| `last()` | Last record or `undefined` |
| `count()` | Count matching records |
| `[Symbol.asyncIterator]()` | Enable `for await...of` iteration |

## Documentation

Full docs at **[vielzeug.dev/deposit](https://vielzeug.dev/deposit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/deposit/usage) | Schema, CRUD, queries, TTL, and transactions |
| [API Reference](https://vielzeug.dev/deposit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/deposit/examples) | Real-world storage patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Deposit** is a schema-driven storage library for the browser: define typed tables, persist to IndexedDB or LocalStorage via a discriminated config, and query with a fluent builder — without writing a single raw database call.

## Installation

```sh
pnpm add @vielzeug/deposit
# npm install @vielzeug/deposit
# yarn add @vielzeug/deposit
```

## Quick Start

```typescript
import { createDeposit, defineSchema } from '@vielzeug/deposit';

interface User { id: string; name: string; age: number }

const schema = defineSchema<{ users: User }>({
  users: { key: 'id', indexes: ['age'] },
});

const db = createDeposit({ type: 'localStorage', dbName: 'my-app', schema });

await db.put('users', { id: '1', name: 'Alice', age: 30 });
await db.put('users', { id: '2', name: 'Bob', age: 25 });

const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();

const alice = await db.get('users', '1');
```

## Features

- ✅ **Schema-driven** — `defineSchema()` types every table and query result
- ✅ **Discriminated config** — `{ type: 'localStorage' | 'indexedDB', ... }` — no separate adapter instances
- ✅ **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `and`, `or`, `orderBy`, `limit`, `offset`, `page`, `reverse`, `map`, `search`
- ✅ **TTL support** — per-record expiry via optional `ttl` (milliseconds) on `put` and `getOrPut`
- ✅ **Transactions** — atomic multi-table writes (IndexedDB only)
- ✅ **Bulk operations** — `put` / `delete` accept single values or arrays
- ✅ **Zero dependencies** — tiny bundle

## Usage

### Defining a Schema

```typescript
import { defineSchema } from '@vielzeug/deposit';

interface Post { id: string; title: string; authorId: string; publishedAt: number }
interface Comment { id: string; postId: string; body: string }

const schema = defineSchema<{ posts: Post; comments: Comment }>({
  posts:    { key: 'id', indexes: ['authorId', 'publishedAt'] },
  comments: { key: 'id', indexes: ['postId'] },
});
```

### Create an Adapter

```typescript
import { createDeposit } from '@vielzeug/deposit';

// LocalStorage — simple, synchronous under the hood, ~5-10 MB limit
const db = createDeposit({ type: 'localStorage', dbName: 'my-app', schema });

// IndexedDB — async, larger storage, supports migrations and transactions
const db = createDeposit({
  type: 'indexedDB',
  dbName: 'my-app',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx) => { /* ... */ },
});
```

### CRUD

```typescript
// Upsert
await db.put('posts', { id: '1', title: 'Hello', authorId: 'u1', publishedAt: Date.now() });

// Upsert with TTL (expires after 1 hour)
await db.put('sessions', session, 3_600_000);

// Get by key
const post = await db.get('posts', '1');
const post = await db.get('posts', '1', defaultPost); // with default value

// Get all
const all = await db.getAll('posts');

// Delete
await db.delete('posts', '1');

// Clear table
await db.clear('posts');

// Count
const total = await db.count('posts');

// Check existence
const exists = await db.has('posts', '1');

// Partial update — returns true if the record existed
const patched = await db.update('posts', '1', { title: 'Updated' });

// Get or create (cache pattern)
const post = await db.getOrPut('posts', '1', () => fetchPost('1'), 60_000);
```

### Bulk Operations

`put` and `delete` accept a single value or an array:

```typescript
await db.put('posts', [post1, post2, post3]);
await db.put('sessions', sessions, 3_600_000); // with TTL

await db.delete('posts', ['id1', 'id2', 'id3']);
```

### Query Builder

```typescript
// Equality
const byAuthor = await db.query('posts').equals('authorId', 'u1').toArray();

// Range (number or string)
const recent = await db
  .query('posts')
  .between('publishedAt', Date.now() - 86_400_000, Date.now())
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .toArray();

// Prefix match (case-insensitive)
const results = await db.query('posts').startsWith('title', 'Hello', true).toArray();

// Custom predicate
const long = await db.query('posts').filter(p => p.title.length > 50).toArray();

// Logical AND / OR
const recent = await db.query('posts').and(
  p => p.authorId === 'u1',
  p => p.publishedAt > Date.now() - 86_400_000,
).toArray();

const either = await db.query('posts').or(
  p => p.authorId === 'u1',
  p => p.authorId === 'u2',
).toArray();

// Pagination
const page2 = await db.query('posts').orderBy('publishedAt').page(2, 20).toArray();

// Map to new type
const titles = await db.query('posts').map(p => p.title).toArray();
// QueryBuilder<string>

// Fuzzy search
const found = await db.query('posts').search('typescript').toArray();

// Terminal methods
const first = await db.query('posts').orderBy('publishedAt').first();
const last  = await db.query('posts').orderBy('publishedAt').last();
const count = await db.query('posts').equals('authorId', 'u1').count();
```

### Transactions (IndexedDB only)

```typescript
import type { IndexedDBHandle } from '@vielzeug/deposit';

const db = createDeposit({ type: 'indexedDB', dbName: 'my-app', version: 1, schema }) as IndexedDBHandle<typeof schema>;

await db.transaction(['posts', 'comments'], async (tx) => {
  await tx.put('posts', { id: 'p1', title: 'New post', authorId: 'u1', publishedAt: Date.now() });
  await tx.put('comments', { id: 'c1', postId: 'p1', body: 'First comment!' });
  await tx.delete('posts', 'old-id');
  // All changes committed atomically — if the callback throws, nothing is persisted
});
```

> **Note:** `transaction()` is only available on `IndexedDBHandle` (returned when `type: 'indexedDB'`).

### Schema Migrations (IndexedDB)

```typescript
import type { MigrationFn } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, newVersion, tx) => {
  if (oldVersion < 2) {
    const store = tx.objectStore('users');
    const req = store.getAll();
    req.onsuccess = () => {
      for (const user of req.result) {
        if (!user.role) { user.role = 'user'; store.put(user); }
      }
    };
  }
};

const db = createDeposit({ type: 'indexedDB', dbName: 'my-app', version: 2, schema, migrationFn });
```

## API

### `defineSchema<S>(schema)`

Creates a type-safe schema definition. `S` maps table names to record types.

```typescript
const schema = defineSchema<{ users: User }>({
  users: { key: 'id', indexes: ['email', 'role'] },
});
```

### `createDeposit(config)`

| Config field | Type | Description |
|---|---|---|
| `type` | `'localStorage' \| 'indexedDB'` | Adapter to use |
| `dbName` | `string` | Database / storage namespace |
| `schema` | `Schema<S>` | Schema from `defineSchema()` |
| `version` | `number` | *(indexedDB only)* Schema version, default `1` |
| `migrationFn` | `MigrationFn` | *(indexedDB only)* Called on version upgrade |
| `logger` | `Logger` | Custom logger, default `console` |

Returns `Adapter<S>` for `localStorage`, or `IndexedDBHandle<S>` for `indexedDB` (which extends `Adapter<S>` with `transaction()`).

### `Adapter<S>` methods

| Method | Description |
|---|---|
| `get(table, key, default?)` | Fetch by primary key (returns `undefined` if expired/missing) |
| `getAll(table)` | Fetch all non-expired records |
| `put(table, value, ttl?)` | Upsert one or an array of records; optional TTL in ms |
| `delete(table, key)` | Delete one key or an array of keys |
| `update(table, key, patch)` | Partially update a record; returns `true` if the key existed |
| `has(table, key)` | Check if a non-expired record exists; returns `Promise<boolean>` |
| `getOrPut(table, key, factory, ttl?)` | Return cached value or store the factory result |
| `clear(table)` | Remove all records from table |
| `count(table)` | Count non-expired records |
| `query(table)` | Start a `QueryBuilder` for the table |

### `QueryBuilder<T>` methods

**Chainable (return a new `QueryBuilder`):**

| Method | Description |
|---|---|
| `equals(field, value)` | Exact match |
| `between(field, lower, upper)` | Range filter (number or string) |
| `startsWith(field, prefix, ignoreCase?)` | Prefix filter on string fields |
| `filter(fn)` | Arbitrary predicate |
| `and(...predicates)` | All predicates must match |
| `or(...predicates)` | Any predicate must match |
| `orderBy(field, 'asc' \| 'desc')` | Sort; default `'asc'` |
| `limit(n)` | Take at most `n` results |
| `offset(n)` | Skip first `n` results |
| `page(num, size)` | Cursor-style pagination |
| `reverse()` | Reverse current order |
| `map<U>(fn)` | Transform records; returns `QueryBuilder<U>` |
| `search(query, tone?)` | Fuzzy full-text search |

**Terminal (return a `Promise`):**

| Method | Description |
|---|---|
| `toArray()` | Execute and return all results |
| `first()` | Return first result or `undefined` |
| `last()` | Return last result or `undefined` |
| `count()` | Return result count |

### `IndexedDBHandle.transaction(tables, fn)`

Atomic multi-table write. `fn` receives a `TransactionContext` with `put(table, value, ttl?)` and `delete(table, key)` methods. All operations run in a single `IDBTransaction` — if the callback throws, all changes are aborted.

## Documentation

Full docs at **[vielzeug.dev/deposit](https://vielzeug.dev/deposit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/deposit/usage) | Schema, adapters, CRUD, queries |
| [API Reference](https://vielzeug.dev/deposit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/deposit/examples) | Real-world storage patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
