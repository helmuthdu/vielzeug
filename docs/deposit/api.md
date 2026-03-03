---
title: Deposit — API Reference
description: Complete API reference for Deposit storage and query builder.
---

# Deposit API Reference

[[toc]]

## `createDeposit()` factory

The `createDeposit()` function is a factory (not a class) that returns a `DepositBaseAdapter<S>`. Pass either an adapter instance or a configuration object.

## Deposit Methods

### `createDeposit(config)`

Creates a createDeposit adapter.

**Parameters:**

- `config: DepositBaseAdapter<S> | AdapterConfig<S>` – Either an adapter instance or a configuration object

**Example:**

```ts
// With adapter instance
const adapter = new IndexedDBAdapter('my-db', 1, schema);
const db = createDeposit(adapter);

// With configuration object
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

Performs operations across multiple tables with automatic adapter-appropriate behavior.

**Atomicity:**

- **IndexedDB**: Fully atomic – all changes happen in a single IDBTransaction (ACID guarantees)
- **LocalStorage**: Optimistic – changes are applied sequentially (not atomic across tables)

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

  // For IndexedDB: Changes are committed atomically
  // For LocalStorage: Changes are committed optimistically
});
```

**Behavior:**

- Loads all specified tables into memory
- Executes the callback with in-memory proxies
- On success: commits all changes (atomically for IndexedDB)
- On error: rolls back all changes without persisting

---

### `patch(table, patches)`

Applies a batch of operations (put, delete, clear) atomically.

**Parameters:**

- `table: keyof S` – Table name
- `patches: PatchOperation[]` – Array of operations

**Returns:** `Promise<void>`

**Example:**

```ts
await db.patch('users', [
  { type: 'put', value: { id: 'u1', name: 'Alice', email: 'a@example.com' } },
  { type: 'put', value: { id: 'u2', name: 'Bob', email: 'b@example.com' }, ttl: 3600000 },
  { type: 'delete', key: 'u3' },
  { type: 'clear' }, // Clears all, then applies puts
]);
```

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

### `where(field, predicate)`

Filters using custom predicate function.

**Example:**

```ts
const verified = await db
  .query('users')
  .where('email', (email) => email.endsWith('@company.com'))
  .toArray();
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

### `not(fn)`

Excludes records where the predicate returns `true`.

**Example:**

```ts
const nonAdmins = await db
  .query('users')
  .not((u) => u.role === 'admin')
  .toArray();
```

::: tip Combining conditions
For AND-like behaviour, chain multiple `.filter()` calls. For OR-like behaviour, use a single `.filter()` with `||`:
```ts
// AND
const seniors = await db.query('users')
  .filter((u) => u.role === 'admin')
  .filter((u) => u.age >= 30)
  .toArray();

// OR
const either = await db.query('users')
  .filter((u) => u.role === 'admin' || u.age >= 50)
  .toArray();
```
:::

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

### `average(field)`, `min(field)`, `max(field)`, `sum(field)`

Numeric aggregations.

**Example:**

```ts
const avgAge = await db.query('users').average('age');
const youngest = await db.query('users').min('age');
const oldest = await db.query('users').max('age');
const totalAge = await db.query('users').sum('age');
```

---

### `map(callback)`

Transforms each record in the result set. Returns `this` for chaining.

**Parameters:**

- `callback: (record: T) => T` – Transformation function applied to each record

**Example:**

```ts
const uppercased = await db
  .query('users')
  .map((user) => ({
    ...user,
    name: user.name.toUpperCase(),
  }))
  .toArray();
```

---

### `toGrouped(field)`

Type-safe grouping. Returns an array of grouped results with proper typing.

**Parameters:**

- `field: K` – Field to group by

**Returns:** `Promise<Array<{ key: T[K], values: T[] }>>`

**Example:**

```ts
const grouped = await db.query('users').toGrouped('role');
// Type: Array<{ key: 'admin' | 'user', values: User[] }>

for (const group of grouped) {
  console.log(`${group.key}: ${group.values.length} users`);
}
```

::: tip Recommended
Use `toGrouped()` for better type safety and clearer intent. It returns properly typed results without requiring manual type casting.
:::

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

### `reset()`

Resets the query builder to start fresh.

**Example:**

```ts
const builder = db.query('users').equals('role', 'admin').reset().equals('role', 'user'); // Start over
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

Storage adapter using browser LocalStorage with schema validation and safe key encoding.

**Constructor:**

```ts
new LocalStorageAdapter(dbName: string, schema: S, logger?: Logger)
```

**Example:**

```ts
const adapter = new LocalStorageAdapter('my-app', schema);
const db = createDeposit(adapter);
```

**Characteristics:**

- Synchronous operations (wrapped in promises for API consistency)
- ~5-10MB storage limit
- String-based storage (JSON serialization)
- Survives page reloads
- Shared across all tabs/windows
- **Schema validation** on initialization (throws clear errors for invalid schemas)
- **Safe key encoding** using `encodeURIComponent` (handles special characters including colons)
- **Graceful error handling** (corrupted entries are skipped and deleted, not thrown)

**Schema Validation:**

```ts
// ✅ Valid – will work
const validSchema = defineSchema<{ users: User }>()({ users: { key: 'id' } });

// ❌ Invalid – will throw immediately
const invalidSchema = {
  users: {}, // Missing 'key' field
};
// Error: "Invalid schema: table "users" missing required "key" field..."
```

**Safe Key Handling:**

```ts
// Special characters in dbName and table names are safely encoded
const adapter = new LocalStorageAdapter('my:app:db', schema); // ✅ Works
```

---

### `IndexedDBAdapter<S>`

Storage adapter using browser IndexedDB with schema validation and robust index creation.

**Constructor:**

```ts
new IndexedDBAdapter(
  dbName: string,
  version: number,
  schema: S,
  migrationFn?: DepositMigrationFn<S>
)
```

**Example:**

```ts
const adapter = new IndexedDBAdapter('my-app', 1, schema, (db, oldVersion, newVersion, tx, schema) => {
  // Optional migration logic
});
const db = createDeposit(adapter);
```

**Characteristics:**

- Asynchronous, transaction-based operations
- Much larger storage limits (typically hundreds of MB to GB)
- Native object storage with indexes
- Supports complex queries via indexes
- Isolated per origin
- **Schema validation** on initialization
- **Smart index creation** (detects duplicates, skips redundant key path indexes)
- **Robust error handling** for index creation failures

**Index Creation:**

```ts
const schema = defineSchema<{ users: User }>()({ users: { key: 'id', indexes: ['email', 'role', 'email'] } });
// Logs warning: "Duplicate index \"email\" in table \"users\" – skipping"

const schema2 = defineSchema<{ users: User }>()({ users: { key: 'id', indexes: ['id'] } });
// Logs warning: "Skipping index on key path "id" – redundant"
```

```ts
const adapter = new IndexedDBAdapter('my-app', 1, schema, (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 1) {
    // Migration logic
  }
});

const db = createDeposit(adapter);
```

**Characteristics:**

- Asynchronous operations
- ~50MB+ storage (quota-based)
- Supports indexes for fast lookups
- Survives page reloads
- Isolated per origin

## Types

### `DepositDataSchema`

Schema definition type.

```ts
type DepositDataSchema = {
  [tableName: string]: {
    key: string; // Primary key field name
    indexes?: string[]; // Optional index fields
    record: any; // Record type
  };
};
```

**Example:**

```ts
import { defineSchema } from '@vielzeug/deposit';

// Recommended: Use defineSchema helper for clean syntax
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id',
    indexes: ['email', 'role'],
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
  },
});
```

---

### `defineSchema<S>()(schema)`

Helper function to create a type-safe schema definition with clean syntax.

**Generic Parameters:**

- `S` – Schema definition type (maps table names to record types)

**Parameters:**

- `schema: { [K in keyof S]: { key: keyof S[K]; indexes?: Array<keyof S[K]> } }`

**Returns:** `DepositDataSchema<S>`

**Example:**

```ts
import { defineSchema } from '@vielzeug/deposit';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
}

// Curried function for better type inference
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id',
    indexes: ['email'],
  },
  posts: {
    key: 'id',
  },
});
```

**Benefits:**

- ✅ No need for empty `record: {} as Type` declarations
- ✅ Full type inference and autocomplete for keys and indexes
- ✅ Clean, minimal syntax
- ✅ Type-safe field validation

---

### `DepositMigrationFn<S>`

Migration function type for IndexedDB schema changes.

```ts
type DepositMigrationFn<S> = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
  schema: S,
) => void | Promise<void>;
```

**Example:**

```ts
const migration: DepositMigrationFn<typeof schema> = async (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 2) {
    // Migrate data from version 1 to 2
    const store = tx.objectStore('users');
    const request = store.getAll();

    request.onsuccess = () => {
      for (const user of request.result) {
        user.role = user.role || 'user';
        store.put(user);
      }
    };
  }
};
```

---

### `PatchOperation<T, K>`

Operation types for `patch()` method.

```ts
type PatchOperation<T, K> = { type: 'put'; value: T; ttl?: number } | { type: 'delete'; key: K } | { type: 'clear' };
```

## Advanced Usage

### TTL (Time-To-Live)

Records can expire automatically:

```ts
// Expires in 1 hour
await db.put('sessions', { id: 's1', token: 'abc' }, 3600000);

// After 1 hour
const session = await db.get('sessions', 's1'); // undefined (expired)
```

### Type Safety

Deposit provides full type inference:

```ts
const user = await db.get('users', 'u1');
// user is typed as: { id: string; name: string; email: string } | undefined

const users = await db
  .query('users')
  .filter((u) => u.name.includes('Alice')) // Full autocomplete
  .toArray();
```

Implements all `DepositBaseAdapter` methods and `connect()`.

## Types

### `DepositDataRecord<T, K>`

Defines a table schema entry.

- `key`: Primary key field name.
- `indexes`: Optional array of index field names.
- `record`: The record type.

### `DepositDataSchema<S>`

Maps table names to `DepositDataRecord` definitions.

### `DepositBaseAdapter<S>`

Abstract base class for storage adapters. Both `LocalStorageAdapter` and `IndexedDBAdapter` extend this. Methods:

- `get`, `getAll`, `put`, `delete`, `clear`, `count`, `bulkPut`, `bulkDelete`, `transaction`, `query`, `patch`
