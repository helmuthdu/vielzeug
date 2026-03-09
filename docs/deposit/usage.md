---
title: Deposit — Usage Guide
description: How to use Deposit for schema-driven browser storage with IndexedDB and LocalStorage.
---

# Deposit Usage Guide

[[toc]]

## Defining a Schema

Use `defineSchema<S>(schema)` to create a fully-typed schema. The type parameter `S` maps table names to record types; the runtime value describes the primary key and optional indexes per table.

```ts
import { defineSchema } from '@vielzeug/deposit';

interface User    { id: number; name: string; age: number; city?: string }
interface Post    { id: number; title: string; authorId: number; publishedAt: number }
interface Comment { id: number; postId: number; body: string }

const schema = defineSchema<{ users: User; posts: Post; comments: Comment }>({
  users:    { key: 'id', indexes: ['name', 'age'] },
  posts:    { key: 'id', indexes: ['authorId', 'publishedAt'] },
  comments: { key: 'id', indexes: ['postId'] },
});
```

### Inline Schema

No separate variable is necessary. Pass the schema inline with a type parameter directly to the factory:

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const db = createLocalStorage<{ users: { id: number; name: string } }>({
  dbName: 'my-app',
  schema: { users: { key: 'id' } },
});
```

::: tip Indexes in LocalStorage
The `indexes` field is only used by the IndexedDB adapter. The LocalStorage adapter logs a warning and ignores them at runtime.
:::

## Creating an Adapter

Deposit provides two factory functions that return the same `Adapter<S>` interface.

### `createLocalStorage(options)`

Synchronous under the hood. Best for small datasets and short-lived browser state (~5–10 MB storage limit).

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const db = createLocalStorage({ dbName: 'my-app', schema });
```

**Options:**

| Property | Type | Description |
|---|---|---|
| `dbName` | `string` | Namespace prefix for all localStorage keys |
| `schema` | `Schema<S>` | Schema created by `defineSchema()` or inline object |
| `logger?` | `Logger` | Custom logger; defaults to `console` |

### `createIndexedDB(options)`

Async, quota-based storage (typically hundreds of MB). Connection is lazy — opened on the first operation. Call `db.close()` when done.

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const db = createIndexedDB({
  dbName: 'my-app',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx) => {
    // runs inside onupgradeneeded
  },
});

// Close the connection when the app shuts down
db.close();
```

**Options:**

| Property | Type | Description |
|---|---|---|
| `dbName` | `string` | IDB database name |
| `version?` | `number` | Database version (default: `1`) |
| `schema` | `Schema<S>` | Schema created by `defineSchema()` or inline object |
| `migrationFn?` | `MigrationFn` | Runs inside `onupgradeneeded` for schema migrations |
| `logger?` | `Logger` | Custom logger; defaults to `console` |

## CRUD Operations

All methods are `async` on both adapters for a consistent API.

### `put(table, value, ttl?)`

Upserts one record or an array of records. An optional `ttl` (milliseconds) sets the expiry timestamp.

```ts
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', [user1, user2, user3]);            // bulk upsert
await db.put('users', { id: 1, name: 'Alice', age: 30 }, 3_600_000); // expires in 1 hour
```

### `get(table, key, defaultValue?)`

Returns the record by primary key, or `undefined` when absent or expired. When `defaultValue` is supplied the return type narrows to `T` (never `undefined`).

```ts
const user = await db.get('users', 1);               // User | undefined
const user = await db.get('users', 1, { id: 0, name: 'Guest', age: 0 }); // User
```

### `getAll(table)`

Returns all live records. Expired entries are filtered out; the IndexedDB adapter also evicts them from the store asynchronously.

```ts
const users = await db.getAll('users'); // User[]
```

### `getMany(table, keys[])`

Batch fetch by a list of primary keys. Missing or expired records are omitted from the result.

```ts
const users = await db.getMany('users', [1, 2, 5]); // User[]
```

### `patch(table, key, partial)`

Merges the partial object into the existing record and returns the result. Returns `undefined` when the key is absent or expired. TTL is preserved.

```ts
const updated = await db.patch('users', 1, { age: 31 });
// updated: { id: 1, name: 'Alice', age: 31 } | undefined
```

### `delete(table, key)`

Removes one record or an array of records. Silently ignores missing keys.

```ts
await db.delete('users', 1);
await db.delete('users', [1, 2, 3]);  // bulk delete
```

### `deleteAll(table)`

Removes all records in a table. Silently succeeds on an empty table.

```ts
await db.deleteAll('users');
```

### `has(table, key)`

Returns `true` when a live (non-expired) record exists for the given key.

```ts
const exists = await db.has('users', 1); // boolean
```

### `count(table)`

Counts live records without allocating the full result set.

```ts
const total = await db.count('users'); // number
```

### `getOrPut(table, key, factory, ttl?)`

Returns the cached record if present; otherwise calls `factory()`, stores the result, and returns it.

```ts
const user = await db.getOrPut('users', 1, () => fetchUser(1), 60_000);
```

## Query Builder

`db.from(table)` returns a lazy `QueryBuilder<T>` — no query runs until a terminal is called.

### Filtering

```ts
const qb = db.from('users');

// Strict equality
await qb.equals('city', 'Paris').toArray();

// Inclusive range (numbers or strings)
await qb.between('age', 18, 30).toArray();

// Prefix match
await qb.startsWith('name', 'Al').toArray();
await qb.startsWith('name', 'al', true).toArray(); // case-insensitive

// Custom predicate
await qb.filter(u => u.age > 18 && (u.city ?? '').length > 0).toArray();

// Logical AND / OR
await qb.and(u => u.city === 'Paris', u => u.age > 25).toArray();
await qb.or(u => u.city === 'Paris', u => u.city === 'Berlin').toArray();
```

### Sorting & Pagination

```ts
// Sort
await qb.orderBy('age', 'asc').toArray();
await qb.orderBy('name', 'desc').toArray();
await qb.reverse().toArray();

// Slice
await qb.limit(10).toArray();
await qb.offset(5).toArray();
await qb.page(2, 20).toArray(); // page 2, 20 per page
```

### Search & Contains

`search` performs a **fuzzy** match across all fields using the `@vielzeug/toolkit` search engine. `contains` performs a case-insensitive **substring** match.

```ts
// Fuzzy search — all fields
await qb.search('alice').toArray();
await qb.search('alice', 0.5).toArray(); // with tone/sensitivity

// Substring match — named fields
await qb.contains('ali', ['name']).toArray();
await qb.contains('paris', ['city', 'address']).toArray();

// Substring match — all string fields
await qb.contains('paris').toArray();
```

### Projection

`map` transforms each record to a new type and returns a `QueryBuilder<U>`.

```ts
const ids  = await db.from('users').map(u => u.id).toArray();        // number[]
const dtos = await db.from('users').map(u => ({ name: u.name })).toArray();
```

### Terminals

```ts
const all   = await qb.toArray();  // T[]
const first = await qb.first();    // T | undefined
const last  = await qb.last();     // T | undefined
const count = await qb.count();    // number
```

### Async Iteration

`QueryBuilder` implements `AsyncIterator`. Use `for await...of` for streamed processing without calling `.toArray()` explicitly.

```ts
for await (const user of db.from('users').orderBy('name').limit(100)) {
  console.log(user.name);
}
```

## TTL

Pass a TTL (time-to-live in milliseconds) as the third argument to `put`, or the fourth argument to `getOrPut`. The expiry timestamp is stored in an internal envelope alongside the value.

```ts
// Expires in 1 hour
await db.put('sessions', { id: 's1', token: 'abc' }, 3_600_000);

// Returns undefined after expiry — and removes the entry from storage
const session = await db.get('sessions', 's1');

// patch preserves existing TTL
const updated = await db.patch('sessions', 's1', { token: 'xyz' });

// Cache pattern with TTL
const data = await db.getOrPut('cache', 'key', () => fetchData(), 5 * 60_000);
```

::: tip Lazy eviction
Expired entries are removed lazily: the LocalStorage adapter evicts on read; the IndexedDB adapter evicts in a background write after `getAll()` returns.
:::

## Transactions

Transactions are only available on the IndexedDB adapter (`IndexedDBHandle`). All writes in the callback are committed atomically — if the callback throws, nothing is persisted.

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const db = createIndexedDB({ dbName: 'my-app', version: 1, schema });

await db.transaction(['posts', 'comments'], async (tx) => {
  // Full CRUD available on the transaction context
  const post = await tx.get('posts', 1);
  await tx.put('posts', { id: 1, title: 'Hello', authorId: 1, publishedAt: Date.now() });
  await tx.patch('posts', 1, { title: 'Hello, World!' });
  await tx.delete('posts', 99);
  await tx.put('comments', { id: 1, postId: 1, body: 'First!' });

  const all = await tx.getAll('posts');
});
```

::: warning
The `transaction()` method is only available on `IndexedDBHandle` (returned by `createIndexedDB()`), not on `Adapter`.
:::

## Schema Migrations

Provide a `migrationFn` to `createIndexedDB` to migrate the database when `version` increases. The function runs inside the browser's `onupgradeneeded` event and receives the raw `IDBDatabase` and `IDBTransaction`.

```ts
import type { MigrationFn } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
  if (oldVersion < 2) {
    // Add an index added in v2
    const store = tx.objectStore('users');
    store.createIndex('email', 'v.email', { unique: true });
  }
  if (oldVersion < 3) {
    // Create a new table in v3
    db.createObjectStore('tags', { keyPath: 'v.id' });
  }
};

const db = createIndexedDB({ dbName: 'my-app', version: 3, schema, migrationFn });
```

::: tip Key path prefix
Deposit stores records inside an envelope `{ v: record, exp?: number }`. Index paths must therefore use `'v.fieldName'` as the key path.
:::
