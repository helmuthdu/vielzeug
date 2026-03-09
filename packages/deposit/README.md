# @vielzeug/deposit

> Type-safe browser storage with schema-driven queries for IndexedDB and LocalStorage

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
- ✅ **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `orderBy`, `limit`, `offset`, `page`, `reverse`, `map`, `search`
- ✅ **TTL support** — per-record expiry via optional `ttl` (milliseconds) on `put` / `bulkPut`
- ✅ **Transactions** — atomic multi-table writes (IndexedDB only)
- ✅ **Bulk operations** — `bulkPut` / `bulkDelete`
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
```

### Bulk Operations

```typescript
await db.bulkPut('posts', [post1, post2, post3]);
await db.bulkPut('sessions', sessions, 3_600_000); // with TTL

await db.bulkDelete('posts', ['id1', 'id2', 'id3']);
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
await db.transaction(['posts', 'comments'], async (stores) => {
  stores.posts.push({ id: 'p1', title: 'New post', authorId: 'u1', publishedAt: Date.now() });
  stores.comments.push({ id: 'c1', postId: 'p1', body: 'First comment!' });
  // All changes committed atomically in a single IDBTransaction
});
```

> **Note:** `transaction()` is only available on `IndexedDBAdapter`.

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

Returns an `Adapter<S>`.

### `Adapter<S>` methods

| Method | Description |
|---|---|
| `get(table, key, default?)` | Fetch by primary key (returns `undefined` if expired/missing) |
| `getAll(table)` | Fetch all non-expired records |
| `put(table, value, ttl?)` | Upsert; optional TTL in ms |
| `delete(table, key)` | Delete by key |
| `clear(table)` | Remove all records from table |
| `count(table)` | Count non-expired records |
| `bulkPut(table, values, ttl?)` | Upsert multiple records |
| `bulkDelete(table, keys)` | Delete multiple records |
| `query(table)` | Start a `QueryBuilder` for the table |

### `QueryBuilder<T>` methods

**Chainable (return a new `QueryBuilder`):**

| Method | Description |
|---|---|
| `equals(field, value)` | Exact match |
| `between(field, lower, upper)` | Range filter (number or string) |
| `startsWith(field, prefix, ignoreCase?)` | Prefix filter on string fields |
| `filter(fn)` | Arbitrary predicate |
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

### `IndexedDBAdapter.transaction(tables, fn, ttl?)`

Atomic multi-table write. `fn` receives a map of `{ [table]: records[] }` that you mutate; changes are committed in a single `IDBTransaction`.

## Documentation

Full docs at **[vielzeug.dev/deposit](https://vielzeug.dev/deposit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/deposit/usage) | Schema, adapters, CRUD, queries |
| [API Reference](https://vielzeug.dev/deposit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/deposit/examples) | Real-world storage patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
