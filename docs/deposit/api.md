---
title: Deposit — API Reference
description: Complete API reference for Deposit storage and query builder.
---

# Deposit API Reference

[[toc]]

## `createDeposit()` factory

The `createDeposit()` function is a factory that returns an `Adapter<S>`. Pass a configuration object specifying the adapter type, database name, schema, and optional settings.

## Deposit Methods

### `createDeposit(config)`

Creates a deposit adapter.

**Parameters:**

- `config: AdapterConfig<S>` – Configuration object

**Returns:** `Adapter<S>`

**Example:**

```ts
const db = createDeposit({
  type: 'indexedDB',
  dbName: 'my-db',
  version: 1,
  schema,
});
```

---

### `put(table, value, ttl?)`

Inserts or updates a single record.

**Parameters:**

- `table: keyof S` – Table name
- `value: S[K]['record']` – Record to store
- `ttl?: number` – Optional time-to-live in milliseconds

**Returns:** `Promise<void>`

**Example:**

```ts
// Insert/update
await db.put('users', {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
});

// With TTL (expires in 1 hour)
await db.put(
  'sessions',
  {
    id: 's1',
    token: 'abc123',
  },
  3600000,
);
```

---

### `get(table, key, defaultValue?)`

Retrieves a single record by its key.

**Parameters:**

- `table: keyof S` – Table name
- `key: KeyType<S, K>` – Record key
- `defaultValue?: T` – Optional default value if not found

**Returns:** `Promise<T | undefined>`

**Example:**

```ts
const user = await db.get('users', 'u1');

// With default value
const user = await db.get('users', 'u1', {
  id: 'u1',
  name: 'Guest',
  email: '',
});
```

---

### `getAll(table)`

Retrieves all records from a table.

**Parameters:**

- `table: keyof S` – Table name

**Returns:** `Promise<S[K]['record'][]>`

**Example:**

```ts
const allUsers = await db.getAll('users');
console.log(`Found ${allUsers.length} users`);
```

---

### `delete(table, key)`

Deletes a single record by its key.

**Parameters:**

- `table: keyof S` – Table name
- `key: KeyType<S, K>` – Record key

**Returns:** `Promise<void>`

**Example:**

```ts
await db.delete('users', 'u1');
```

---

### `clear(table)`

Removes all records from a table.

**Parameters:**

- `table: keyof S` – Table name

**Returns:** `Promise<void>`

**Example:**

```ts
await db.clear('users');
```

---

### `count(table)`

Returns the number of records in a table.

**Parameters:**

- `table: keyof S` – Table name

**Returns:** `Promise<number>`

**Example:**

```ts
const userCount = await db.count('users');
console.log(`${userCount} users in database`);
```

---

### `bulkPut(table, values, ttl?)`

Inserts or updates multiple records in a single operation.

**Parameters:**

- `table: keyof S` – Table name
- `values: S[K]['record'][]` – Array of records
- `ttl?: number` – Optional TTL for all records

**Returns:** `Promise<void>`

**Example:**

```ts
await db.bulkPut('users', [
  { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com' },
  { id: 'u3', name: 'Carol', email: 'carol@example.com' },
]);
```

---

### `bulkDelete(table, keys)`

Deletes multiple records by their keys.

**Parameters:**

- `table: keyof S` – Table name
- `keys: KeyType<S, K>[]` – Array of keys to delete

**Returns:** `Promise<void>`

**Example:**

```ts
await db.bulkDelete('users', ['u1', 'u2', 'u3']);
```

---

### `query(table)`

Creates a QueryBuilder for advanced querying.

**Parameters:**

- `table: keyof S` – Table name

**Returns:** `QueryBuilder<S[K]['record']>`

**Example:**

```ts
const adults = await db
  .query('users')
  .filter((user) => user.age >= 18)
  .orderBy('name', 'asc')
  .toArray();
```

---

### `transaction(tables, fn, ttl?)`

Performs operations across multiple tables within a single atomic `IDBTransaction`.

> **Note:** `transaction()` is only available on `IndexedDBAdapter`. Use individual CRUD methods for localStorage.

**Atomicity:** Fully atomic – all changes happen in a single IDBTransaction (ACID guarantees).

**Parameters:**

- `tables: K[]` – Array of table names
- `fn: (stores: T) => Promise<void>` – Transaction callback receiving store proxies
- `ttl?: number` – Optional TTL for all modified records

**Returns:** `Promise<void>`

**Example:**

```ts
await db.transaction(['users', 'posts'], async (stores) => {
  // Add user
  stores.users.push({
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
  });

  // Add post
  stores.posts.push({
    id: 'p1',
    userId: 'u1',
    title: 'Hello World',
    content: 'My first post',
  });

  // Changes are committed atomically
});
```

**Behavior:**

- Loads all specified tables into memory
- Executes the callback with in-memory proxies
- On success: commits all changes atomically via IDBTransaction
- On error: the IDB transaction is aborted, no changes are persisted

---

## QueryBuilder Methods

### `equals(field, value)`

Filters records where field equals value.

**Example:**

```ts
const admins = await db.query('users').equals('role', 'admin').toArray();
```

---

### `between(field, lower, upper)`

Filters records where field is between lower and upper (inclusive).

**Example:**

```ts
const youngAdults = await db.query('users').between('age', 18, 30).toArray();
```

---

### `startsWith(field, prefix, ignoreCase?)`

Filters string fields that start with prefix.

**Example:**

```ts
const aliceUsers = await db.query('users').startsWith('name', 'Alice', true).toArray();
```

---

### `filter(fn)`

Filters using predicate on entire record.

**Example:**

```ts
const special = await db
  .query('users')
  .filter((user) => user.age > 18 && user.email.includes('gmail'))
  .toArray();
```

---

### `orderBy(field, direction?)`

Sorts results by field.

**Parameters:**

- `field: keyof T` – Field to sort by
- `direction: 'asc' | 'desc'` – Sort direction (default: 'asc')

**Example:**

```ts
const sorted = await db.query('users').orderBy('name', 'asc').toArray();
```

---

### `limit(n)`, `offset(n)`, `page(pageNumber, pageSize)`

Pagination methods.

**Example:**

```ts
// First 10 users
const first10 = await db.query('users').limit(10).toArray();

// Skip first 10, get next 10
const next10 = await db.query('users').offset(10).limit(10).toArray();

// Page 2 (10 per page)
const page2 = await db.query('users').page(2, 10).toArray();
```

---

### `reverse()`

Reverses the order of results.

**Example:**

```ts
const reversed = await db.query('users').orderBy('createdAt', 'asc').reverse().toArray();
```

---

### `count()`, `first()`, `last()`

Aggregation helpers.

**Example:**

```ts
const count = await db.query('users').count();
const firstUser = await db.query('users').first();
const lastUser = await db.query('users').last();
```

---

### `map<U>(callback)`

Transforms each record into a new type. Returns a new `QueryBuilder<U>`.

**Parameters:**

- `callback: (record: T) => U` – Transformation function

**Example:**

```ts
const names = await db
  .query('users')
  .map((user) => ({ name: user.name }))
  .toArray();
// QueryBuilder<{ name: string }>
```

---

### `search(query, tone?)`

Performs fuzzy search across all string fields.

**Parameters:**

- `query: string` – Search query
- `tone?: number` – Optional search sensitivity

**Example:**

```ts
const searchResults = await db.query('users').search('alice').toArray();
```

---

### `toArray()`

Executes the query and returns results.

**Returns:** `Promise<T[]>`

**Example:**

```ts
const results = await db
  .query('users')
  .filter((u) => u.active)
  .orderBy('name', 'asc')
  .toArray();
```

## Adapters

### `LocalStorageAdapter<S>`

Uses `window.localStorage` under the hood. All methods are `async` for a consistent API.

**Constructor:**

```ts
new LocalStorageAdapter(dbName: string, schema: S, logger?: Logger)
```

**Example:**

```ts
const db = createDeposit({ type: 'localStorage', dbName: 'my-app', schema });
```

**Characteristics:**

- ~5-10 MB storage limit
- Keys encoded with `encodeURIComponent` — special characters (including `:`) are safe
- Expired or corrupted entries are removed lazily on read; a warning is logged
- No `transaction()` method

---

### `IndexedDBAdapter<S>`

Uses the native `IDBDatabase` API. Connection is lazy — opened on first operation.

**Constructor:**

```ts
new IndexedDBAdapter(
  dbName: string,
  version: number,
  schema: S,
  migrationFn?: MigrationFn,
  logger?: Logger,
)
```

**Example:**

```ts
const db = createDeposit({
  type: 'indexedDB',
  dbName: 'my-app',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx) => {
    // Migration logic
  },
});
```

**Characteristics:**

- Quota-based storage (typically hundreds of MB)
- Indexes are created from `schema[table].indexes`; duplicate and key-path-redundant indexes produce warnings and are skipped
- Expired entries are filtered out on read
- Supports `transaction()` for atomic multi-table writes

**Index warnings:**

```ts
// Duplicate index — logs warning and skips
const schema = defineSchema<{ users: User }>({
  users: { key: 'id', indexes: ['email', 'role', 'email'] },
});

// Key path index — logs warning and skips
const schema2 = defineSchema<{ users: User }>({
  users: { key: 'id', indexes: ['id'] },
});
```

## Types

### `Schema<S>`

Use `defineSchema<S>(schema)` rather than constructing this directly.

```ts
type Schema<S> = {
  [K in keyof S]: {
    key: keyof S[K];
    indexes?: (keyof S[K])[];
    record: S[K];
  };
};
```

---

### `AdapterConfig<S>`

Discriminated union of `LocalStorageConfig<S>` and `IndexedDBConfig<S>`:

```ts
type AdapterConfig<S> = LocalStorageConfig<S> | IndexedDBConfig<S>;
```

---

### `MigrationFn`

Migration function type for IndexedDB version upgrades.

```ts
type MigrationFn = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
) => void | Promise<void>;
```

---

### `Logger`

```ts
type Logger = {
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
```

Pass a custom logger to suppress or redirect internal warnings. Defaults to `console`.

---

## Advanced Usage

### TTL (Time-To-Live)

Records can expire automatically. The expiry is stored in an internal `__deposit_ttl__` field that is stripped on read.

```ts
// Expires in 1 hour
await db.put('sessions', { id: 's1', token: 'abc' }, 3_600_000);

// Returns undefined after expiry
const session = await db.get('sessions', 's1');
```

### Type Safety

```ts
const user = await db.get('users', 'u1');
// user is typed as: User | undefined

const users = await db
  .query('users')
  .filter((u) => u.name.includes('Alice')) // full autocomplete
  .toArray();
// users is typed as: User[]

const mapped = await db.query('users').map((u) => ({ label: u.name, value: u.id })).toArray();
// mapped is typed as: { label: string; value: string }[]
```
