---
title: Deposit — Usage Guide
description: How to use Deposit for schema-driven browser storage with IndexedDB and LocalStorage.
---

# Deposit Usage Guide

[[toc]]

## Why Deposit?

Raw IndexedDB requires verbose event-based boilerplate; `localStorage` loses type information and offers no query capabilities.

```ts
// Before — raw IndexedDB boilerplate
const req = indexedDB.open('my-app', 1);
req.onupgradeneeded = (e) => {
  (e.target as IDBOpenDBRequest).result.createObjectStore('users', { keyPath: 'id' });
};
req.onsuccess = (e) => {
  const db = (e.target as IDBOpenDBRequest).result;
  const all = db.transaction('users', 'readonly').objectStore('users').getAll();
  all.onsuccess = () => { /* untyped, no filtering */ };
};

// After — Deposit
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';
const schema = defineSchema<{ users: User }>({ users: { key: 'id', indexes: ['age'] } });
const db = createLocalStorage({ dbName: 'my-app', schema });
await db.put('users', { id: 1, name: 'Alice', age: 30 });
const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
```

| Feature              | Deposit                                       | Dexie.js  | idb   |
| -------------------- | --------------------------------------------- | --------- | ----- |
| Bundle size          | <PackageInfo package="deposit" type="size" /> | ~30 kB    | ~5 kB |
| LocalStorage adapter | ✅ Built-in                                   | ❌        | ❌    |
| Query builder        | ✅ Fluent                                     | ✅        | ❌    |
| TTL support          | ✅ Built-in                                   | ❌        | ❌    |
| Typed schema         | ✅                                            | ⚠️ Manual | ❌    |
| Transactions         | ✅ (IndexedDB)                                | ✅        | ✅    |
| Zero dependencies    | ✅                                            | ✅        | ✅    |

**Use Deposit when** you want typed, queryable browser storage across both `localStorage` and IndexedDB through one consistent API.

**Consider Dexie.js** if you need live queries, Dexie Cloud sync, or advanced IndexedDB hooks beyond what Deposit offers.

## Defining a Schema

Use `defineSchema<S>(schema)` to create a fully-typed schema. The type parameter `S` maps table names to record types; the runtime value describes the primary key and optional indexes per table.

```ts
import { defineSchema } from '@vielzeug/deposit';

interface User {
  id: number;
  name: string;
  age: number;
  city?: string;
}
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

const schema = defineSchema<{ users: User; posts: Post; comments: Comment }>({
  users: { key: 'id', indexes: ['name', 'age'] },
  posts: { key: 'id', indexes: ['authorId', 'publishedAt'] },
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

::: warning Private Browsing / Sandboxed Iframes
In Safari private mode and some sandboxed iframes, any access to `localStorage` throws a `SecurityError`. Deposit detects this on the first operation and throws a descriptive error. Use `createIndexedDB` as a fallback in environments where `localStorage` may be unavailable.
:::
**Options:**

| Property  | Type        | Description                                         |
| --------- | ----------- | --------------------------------------------------- |
| `dbName`  | `string`    | Namespace prefix for all localStorage keys          |
| `schema`  | `Schema<S>` | Schema created by `defineSchema()` or inline object |
| `logger?` | `Logger`    | Custom logger; defaults to `console`                |

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

| Property       | Type          | Description                                                         |
| -------------- | ------------- | ------------------------------------------------------------------- |
| `dbName`       | `string`      | IDB database name                                                   |
| `version`      | `number`      | Database version — **required**; increment to trigger `migrationFn` |
| `schema`       | `Schema<S>`   | Schema created by `defineSchema()` or inline object                 |
| `migrationFn?` | `MigrationFn` | Runs inside `onupgradeneeded` for schema migrations                 |
| `logger?`      | `Logger`      | Custom logger; defaults to `console`                                |

## CRUD Operations

All methods are `async` on both adapters for a consistent API.

### `put(table, value, ttl?)`

Upserts a single record. An optional `ttl` (milliseconds) sets the expiry timestamp.

```ts
await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.hours(1)); // expires in 1 hour
```

### `putMany(table, values[], ttl?)`

Upserts multiple records in one call. The same optional `ttl` is applied to each record.

```ts
await db.putMany('users', [user1, user2, user3]);
await db.putMany('sessions', sessions, ttl.hours(1)); // TTL applied to all
```

### `get(table, key)`

Returns the record by primary key, or `undefined` when absent or expired.

```ts
const user = await db.get('users', 1); // User | undefined
```

### `getOr(table, key, defaultValue)`

Returns the record when present, or `defaultValue` when absent or expired. The return type is always `T` — never `undefined`.

```ts
const user = await db.getOr('users', 1, { id: 0, name: 'Guest', age: 0 }); // User
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

Removes a single record. Silently ignores missing keys.

```ts
await db.delete('users', 1);
```

### `deleteMany(table, keys[])`

Removes multiple records in one call. Silently ignores missing keys.

```ts
await db.deleteMany('users', [1, 2, 3]);
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

Counts live records. Both adapters scan all records to exclude TTL-expired entries — O(n).

```ts
const total = await db.count('users'); // number
```

### `getOrPut(table, key, factory, ttl?)`

Returns the cached record if present; otherwise calls `factory()`, stores the result, and returns it.

```ts
const user = await db.getOrPut('users', 1, () => fetchUser(1), ttl.minutes(5));
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
await qb.filter((u) => u.age > 18 && (u.city ?? '').length > 0).toArray();

// Logical AND / OR
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
await qb.search('alice', 0.5).toArray(); // tone: 0 = most permissive, 1 = exact. Default: 0.25

// Substring match — named fields
await qb.contains('ali', ['name']).toArray();
await qb.contains('paris', ['city', 'address']).toArray();

// Substring match — all string fields
await qb.contains('paris').toArray();
```

### Projection

`map` transforms each record and returns a `ProjectedQuery<U>`. Unlike the other query methods, `U` is unconstrained, so projecting to a primitive type works correctly:

```ts
const ids = await db
  .from('users')
  .map((u) => u.id)
  .toArray(); // number[]
const names = await db
  .from('users')
  .map((u) => u.name)
  .toArray(); // string[]
const dtos = await db
  .from('users')
  .map((u) => ({ name: u.name }))
  .toArray();
```

`ProjectedQuery<U>` supports the same terminal methods as `QueryBuilder` — `toArray`, `first`, `last`, `count`, and `for await...of` — but cannot be chained with further query operators.

### Terminals

```ts
const all = await qb.toArray(); // T[]
const first = await qb.first(); // T | undefined
const last = await qb.last(); // T | undefined
const count = await qb.count(); // number
```

### Aggregations

```ts
// count() and pagination
const total = await qb.count();

// reduce
const totalAge = await db.from('users').reduce((sum, u) => sum + u.age, 0);
const names = await db
  .from('users')
  .filter((u) => u.active)
  .reduce<string[]>((acc, u) => [...acc, u.name], []);
```

::: tip count() and pagination
`count()` returns the number of records **after** the full pipeline — including `limit`, `offset`, and `page`. Call `count()` before adding pagination operators if you need the total match count:

```ts
const total = await db.from('users').equals('city', 'Paris').count();
const page = await db.from('users').equals('city', 'Paris').page(1, 20).toArray();
```

:::

### Async Iteration

`QueryBuilder` implements `AsyncIterator`. Use `for await...of` for streamed processing without calling `.toArray()` explicitly.

```ts
for await (const user of db.from('users').orderBy('name').limit(100)) {
  console.log(user.name);
}
```

## TTL

Pass a TTL in milliseconds as the third argument to `put` or `putMany`, or the fourth argument to `getOrPut`.
Use the `ttl` helper to express durations readably:

```ts
import { ttl } from '@vielzeug/deposit';

// named helpers
await db.put('sessions', session, ttl.hours(1));
await db.putMany('cache', entries, ttl.minutes(15));
await db.getOrPut('users', id, fetchUser, ttl.seconds(30));

// raw ms also works
await db.put('tokens', token, 60_000);

// Returns undefined after expiry — and removes the entry from storage
const session = await db.get('sessions', 's1');

// patch preserves existing TTL
const updated = await db.patch('sessions', 's1', { token: 'xyz' });
```

**`ttl` helpers:**

| Helper           | Returns                           |
| ---------------- | --------------------------------- |
| `ttl.ms(n)`      | `n` (identity — raw milliseconds) |
| `ttl.seconds(n)` | `n * 1_000`                       |
| `ttl.minutes(n)` | `n * 60_000`                      |
| `ttl.hours(n)`   | `n * 3_600_000`                   |

::: tip Lazy eviction
Expired entries are removed lazily: the LocalStorage adapter evicts on read; the IndexedDB adapter evicts in a background write after `getAll()` returns.
:::

## Transactions

Transactions are only available on the IndexedDB adapter (`IndexedDBHandle`). All writes in the callback are committed atomically — if the callback throws, nothing is persisted.

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const db = createIndexedDB({ dbName: 'my-app', version: 1, schema });

await db.transaction(['posts', 'comments'], async (tx) => {
  // Reads
  const post = await tx.get('posts', 1);
  const all = await tx.getAll('posts');
  const many = await tx.getMany('posts', [1, 2, 3]);
  const safe = await tx.getOr('posts', 1, defaultPost);
  const exists = await tx.has('posts', 1);
  const total = await tx.count('posts'); // native IDB count — includes TTL-expired
  const recent = await tx.from('posts').orderBy('publishedAt', 'desc').limit(5).toArray();

  // Writes
  await tx.put('posts', { id: 1, title: 'Hello', authorId: 1, publishedAt: Date.now() });
  await tx.putMany('comments', [c1, c2, c3]);
  await tx.patch('posts', 1, { title: 'Hello, World!' });
  await tx.delete('posts', 99);
  await tx.deleteMany('comments', [10, 11]);
  await tx.deleteAll('drafts');
});
```

::: warning
The `transaction()` method is only available on `IndexedDBHandle` (returned by `createIndexedDB()`), not on `Adapter`.
:::

## Schema Migrations

Provide a `migrationFn` to `createIndexedDB` to migrate the database when `version` increases. The function runs inside the browser's `onupgradeneeded` event and receives the raw `IDBDatabase` and `IDBTransaction`.

Deposit stores records inside an envelope `{ v: record, exp?: number }`, which means index key paths must reference `v.fieldName`. Use the exported `storeField()` helper to build these paths so that your migration code stays decoupled from deposit's internals:

```ts
import { type MigrationFn, storeField } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
  if (oldVersion < 2) {
    // Add an index added in v2
    const store = tx.objectStore('users');
    store.createIndex('email', storeField('email'), { unique: true });
  }
  if (oldVersion < 3) {
    // Create a new table in v3
    db.createObjectStore('tags', { keyPath: storeField('id') });
  }
};

const db = createIndexedDB({ dbName: 'my-app', version: 3, schema, migrationFn });
```

::: tip New indexes on existing tables
When you add entries to `indexes` in your schema and bump `version`, deposit automatically creates the missing indexes on the existing object store during the upgrade — no manual `createIndex` call required for indexes declared in the schema.
:::
