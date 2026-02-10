# Deposit API Reference

Complete API documentation for `@vielzeug/deposit`.

## Core Classes

### `Deposit<S>`

Main class for interacting with browser storage. Provides a unified, type-safe API for both IndexedDB and LocalStorage.

**Type Parameters:**

- `S extends DepositDataSchema` - Your schema type defining all tables and their records

---

## Deposit Methods

### `new Deposit(adapterOrConfig)`

Creates a new Deposit instance.

**Parameters:**

- `adapterOrConfig: DepositStorageAdapter<S> | AdapterConfig<S>` - Either a custom adapter or configuration object

**Example:**

```ts
// With adapter instance
const adapter = new IndexedDBAdapter('my-db', 1, schema);
const db = new Deposit(adapter);

// With configuration object
const db = new Deposit({
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

- `table: keyof S` - Table name
- `value: S[K]['record']` - Record to store
- `ttl?: number` - Optional time-to-live in milliseconds

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

- `table: keyof S` - Table name
- `key: KeyType<S, K>` - Record key
- `defaultValue?: T` - Optional default value if not found

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

- `table: keyof S` - Table name

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

- `table: keyof S` - Table name
- `key: KeyType<S, K>` - Record key

**Returns:** `Promise<void>`

**Example:**

```ts
await db.delete('users', 'u1');
```

---

### `clear(table)`

Removes all records from a table.

**Parameters:**

- `table: keyof S` - Table name

**Returns:** `Promise<void>`

**Example:**

```ts
await db.clear('users');
```

---

### `count(table)`

Returns the number of records in a table.

**Parameters:**

- `table: keyof S` - Table name

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

- `table: keyof S` - Table name
- `values: S[K]['record'][]` - Array of records
- `ttl?: number` - Optional TTL for all records

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

- `table: keyof S` - Table name
- `keys: KeyType<S, K>[]` - Array of keys to delete

**Returns:** `Promise<void>`

**Example:**

```ts
await db.bulkDelete('users', ['u1', 'u2', 'u3']);
```

---

### `query(table)`

Creates a QueryBuilder for advanced querying.

**Parameters:**

- `table: keyof S` - Table name

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

Performs an atomic transaction across multiple tables.

**Parameters:**

- `tables: K[]` - Array of table names
- `fn: (stores: T) => Promise<void>` - Transaction callback
- `ttl?: number` - Optional TTL for modified records

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

**Note:** If an error occurs, all changes are rolled back.

---

### `patch(table, patches)`

Applies a batch of operations (put, delete, clear) atomically.

**Parameters:**

- `table: keyof S` - Table name
- `patches: PatchOperation[]` - Array of operations

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

### `not(fn)`, `and(...fns)`, `or(...fns)`

Logical operators for combining predicates.

**Example:**

```ts
const result = await db
  .query('users')
  .and(
    (u) => u.age >= 18,
    (u) => u.verified === true,
  )
  .toArray();
```

---

### `orderBy(field, direction)`

Sorts results by field.

**Parameters:**

- `field: keyof T` - Field to sort by
- `direction: 'asc' | 'desc'` - Sort direction (default: 'asc')

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

### `modify(callback, context?)`

Transforms records in the query.

**Example:**

```ts
const uppercased = await db
  .query('users')
  .modify((user) => ({
    ...user,
    name: user.name.toUpperCase(),
  }))
  .toArray();
```

---

### `groupBy(field)`

Groups records by a field value. Returns an object where keys are the field values.

**Parameters:**

- `field: K` - Field to group by

**Returns:** `this` (for chaining)

**Example:**

```ts
const byRole = await db.query('users').groupBy('role').toArray();
// Result: { admin: User[], user: User[] }
```

::: warning Type Safety
`groupBy()` changes the result structure but returns `T[]` for chaining. You'll need to cast the result manually. For better type safety, use `toGrouped()` instead.
:::

---

### `toGrouped(field)`

Type-safe alternative to `groupBy().toArray()`. Returns an array of grouped results with proper typing.

**Parameters:**

- `field: K` - Field to group by

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

- `query: string` - Search query
- `tone?: number` - Optional search sensitivity

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

---

### `build(conditions)`

Builds query from condition objects (useful for dynamic queries).

**Example:**

```ts
const conditions = [
  { type: 'equals', field: 'role', value: 'admin' },
  { type: 'orderBy', field: 'name', value: 'asc' },
  { type: 'limit', value: 10 },
];

const results = await db.query('users').build(conditions).toArray();
```

---

## Adapters

### `LocalStorageAdapter<S>`

Storage adapter using browser LocalStorage with schema validation and safe key encoding.

**Constructor:**

```ts
new LocalStorageAdapter(dbName: string, version: number, schema: S)
```

**Example:**

```ts
const adapter = new LocalStorageAdapter('my-app', 1, schema);
const db = new Deposit(adapter);
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
// ✅ Valid - will work
const validSchema = {
  users: { key: 'id', record: {} as User }
};

// ❌ Invalid - will throw immediately
const invalidSchema = {
  users: { record: {} as User } // Missing 'key' field
};
// Error: "Invalid schema: table "users" missing required "key" field..."
```

**Safe Key Handling:**

```ts
// Special characters in dbName and table names are safely encoded
const adapter = new LocalStorageAdapter('my:app:db', 1, schema); // ✅ Works
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
const db = new Deposit(adapter);
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
const schema = {
  users: {
    key: 'id',
    indexes: ['email', 'role', 'email'], // Duplicate 'email' detected and skipped
    record: {} as User,
  },
};
// Logs warning: "Duplicate index "email" in table "users" - skipping"

const schema2 = {
  users: {
    key: 'id',
    indexes: ['id'], // Redundant - key path is already indexed
    record: {} as User,
  },
};
// Logs warning: "Skipping index on key path "id" - redundant"
```

```ts
const adapter = new IndexedDBAdapter('my-app', 1, schema, (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 1) {
    // Migration logic
  }
});

const db = new Deposit(adapter);
```

**Characteristics:**

- Asynchronous operations
- ~50MB+ storage (quota-based)
- Supports indexes for fast lookups
- Survives page reloads
- Isolated per origin

---

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
const schema = {
  users: {
    key: 'id',
    indexes: ['email', 'role'],
    record: {} as { id: string; name: string; email: string; role: string },
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
    record: {} as { id: string; userId: string; title: string; createdAt: number },
  },
} satisfies DepositDataSchema;
```

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

---

## Utility Functions

### `runSafe(fn, label?)`

Wraps a function to catch and log errors without throwing.

**Example:**

```ts
import { runSafe } from '@vielzeug/deposit';

const safeFetch = runSafe(async () => {
  const data = await fetch('/api/data').then((r) => r.json());
  return data;
}, 'FETCH_FAILED');

const result = await safeFetch(); // Returns undefined on error
```

---

## Advanced Usage

### Memoization

QueryBuilder automatically memoizes results for performance:

```ts
const query = db.query('users').equals('role', 'admin');

const result1 = await query.toArray(); // Executes query
const result2 = await query.toArray(); // Returns cached result
```

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

Implements all DepositStorageAdapter methods and `connect()`.

## Types

### DepotDataRecord\<T, K\>

Defines a table schema record.

- `key`: The primary key field name.
- `indexes`: Optional array of index field names.
- `record`: The record type.

### DepositDataSchema\<S\>

Maps table names to DepotDataRecord definitions.

### DepositMigrationFn\<S\>

Migration function signature for IndexedDB upgrades.

### DepositStorageAdapter\<S\>

Interface for storage adapters. Methods:

- `bulkDelete`, `bulkPut`, `clear`, `count`, `delete`, `get`, `getAll`, `put`, `connect?`

## Utility Functions

### runSafe(fn, label?)

Wraps a function to suppress and log errors.

### wrapWithExpiry(value, ttl?)

Wraps a value with an expiry timestamp.

### unwrapWithExpiry(value, now, onExpire?)

Unwraps a value, deleting it if expired.
