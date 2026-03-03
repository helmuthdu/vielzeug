# @vielzeug/deposit

> Type-safe browser storage with schema-driven queries for IndexedDB and LocalStorage

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**createDeposit** is a schema-driven storage library for the browser: define typed collections, persist to IndexedDB or LocalStorage, and query with a fluent builder — without writing a single raw database call.

## Installation

```sh
pnpm add @vielzeug/deposit
# npm install @vielzeug/deposit
# yarn add @vielzeug/deposit
```

## Quick Start

```typescript
import { createDeposit, IndexedDBAdapter, defineSchema } from '@vielzeug/deposit';

interface User { id: string; name: string; email: string; age: number }

const schema = defineSchema<{ users: User }>()(({ collection }) => ({
  users: collection<User>({ key: 'id' }),
}));

const db = await createDeposit({
  adapter: IndexedDBAdapter('myapp', schema),
  schema,
});

await db.users.add({ id: '1', name: 'Alice', email: 'alice@example.com', age: 30 });

const adults = await db.users
  .where('age')
  .between(18, 99)
  .orderBy('name')
  .toArray();
```

## Features

- ✅ **Schema-driven** — define typed collections once, get full type inference everywhere
- ✅ **Multiple adapters** — `IndexedDBAdapter` (persistent) and `LocalStorageAdapter` (sync, smaller data)
- ✅ **Fluent query builder** — filter, sort, paginate, aggregate without SQL
- ✅ **Migrations** — structured migration runner for schema evolution
- ✅ **CRUD** — `add`, `put`, `update`, `delete`, `clear`, `count`, `getAll`, `getById`
- ✅ **Aggregations** — `count`, `min`, `max`, `sum`, `average`
- ✅ **Grouping** — `toGrouped(key)` for bucketed results
- ✅ **Type-safe** — TypeScript inference throughout

## Usage

### Defining a Schema

```typescript
import { defineSchema } from '@vielzeug/deposit';

interface Post { id: string; title: string; authorId: string; publishedAt: number }
interface Comment { id: string; postId: string; body: string }

const schema = defineSchema<{ posts: Post; comments: Comment }>()(({ collection }) => ({
  posts:    collection<Post>({ key: 'id' }),
  comments: collection<Comment>({ key: 'id' }),
}));
```

### Adapters

```typescript
import { IndexedDBAdapter, LocalStorageAdapter } from '@vielzeug/deposit';

// IndexedDB — persistent, handles large data, version-based migrations
const idbAdapter = IndexedDBAdapter('my-app', schema, { version: 1 });

// LocalStorage — synchronous, for small/simple data (no version param)
const lsAdapter = LocalStorageAdapter('my-app', schema);
```

### CRUD Operations

```typescript
const db = await createDeposit({ adapter: idbAdapter, schema });

// Add
await db.posts.add({ id: '1', title: 'Hello', authorId: 'u1', publishedAt: Date.now() });

// Put (upsert)
await db.posts.put({ id: '1', title: 'Updated', authorId: 'u1', publishedAt: Date.now() });

// Update (partial)
await db.posts.update('1', { title: 'Patched Title' });

// Delete
await db.posts.delete('1');

// Get by key
const post = await db.posts.getById('1');

// Get all
const all = await db.posts.getAll();
```

### Querying

```typescript
// Filter with where
const recent = await db.posts
  .where('publishedAt')
  .between(Date.now() - 86400_000, Date.now())
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .toArray();

// Equality
const byAuthor = await db.posts.where('authorId').equals('u1').toArray();

// Prefix match
const results = await db.posts.where('title').startsWith('Hello').toArray();

// Custom filter
const long = await db.posts.filter(p => p.title.length > 50).toArray();

// Pagination
const page = await db.posts.orderBy('publishedAt').page(2, 20).toArray();

// Aggregations
const total  = await db.posts.count();
const oldest = await db.posts.min('publishedAt');
const newest = await db.posts.max('publishedAt');

// Grouping
const grouped = await db.posts.toGrouped('authorId');
// Record<string, Post[]>
```

### Migrations

```typescript
import { DepositMigrationFn } from '@vielzeug/deposit';

const migrations: DepositMigrationFn[] = [
  async ({ db }) => {
    // v1 → v2: add index
    db.createObjectStore('tags', { keyPath: 'id' });
  },
];

const db = await createDeposit({
  adapter: IndexedDBAdapter('my-app', schema, { version: 2 }),
  schema,
  migrations,
});
```

## API

### `createDeposit(options)`

| Option | Type | Description |
|---|---|---|
| `adapter` | `StorageAdapter` | `IndexedDBAdapter(...)` or `LocalStorageAdapter(...)` |
| `schema` | `Schema` | Schema created with `defineSchema()()` |
| `migrations` | `DepositMigrationFn[]` | Optional migration runner |

Returns a typed `Db` object with one property per collection.

### `defineSchema<S>()(factory)`

Define the database schema with full type inference.

### Collection Methods

| Method | Description |
|---|---|
| `add(record)` | Insert a record |
| `put(record)` | Upsert a record |
| `update(key, patch)` | Partial update |
| `delete(key)` | Delete by key |
| `clear()` | Remove all records |
| `getById(key)` | Fetch by primary key |
| `getAll()` | Fetch all records |
| `count()` | Count all records |
| `where(field)` | Start a query on a field |
| `filter(fn)` | Arbitrary predicate filter |
| `orderBy(field, dir?)` | Sort results |
| `limit(n)` | Limit result count |
| `offset(n)` | Skip first n records |
| `page(page, size)` | Paginate |
| `toArray()` | Execute query and return array |
| `first()` | Return first result |
| `last()` | Return last result |
| `min(field)` | Minimum field value |
| `max(field)` | Maximum field value |
| `sum(field)` | Sum a numeric field |
| `average(field)` | Average a numeric field |
| `toGrouped(field)` | Group results by field |
| `search(query, fields)` | Full-text search across fields |

## Documentation

Full docs at **[vielzeug.dev/deposit](https://vielzeug.dev/deposit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/deposit/usage) | Schema, adapters, CRUD, queries |
| [API Reference](https://vielzeug.dev/deposit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/deposit/examples) | Real-world storage patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
