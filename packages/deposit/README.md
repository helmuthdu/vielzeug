# @vielzeug/deposit

## What is Deposit?

**Deposit** is a type-safe browser storage utility that provides a unified API for IndexedDB and LocalStorage. Build robust offline-first applications with powerful querying, transactions, and schema migrations—all with minimal code and maximum flexibility.

### The Problem

Working with browser storage APIs is challenging:

- **IndexedDB** is powerful but has a complex, callback-based API
- **LocalStorage** is simple but limited to string key-value pairs
- No built-in TypeScript support or type safety
- No query capabilities beyond basic get/set
- Manual JSON serialization and error handling
- Schema migrations are manual and error-prone

### The Solution

Deposit provides a clean, type-safe abstraction over both storage APIs:

```typescript
import { Deposit, defineSchema } from '@vielzeug/deposit';

// Define your schema
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: { key: 'id', indexes: ['email', 'role'] },
  posts: { key: 'id', indexes: ['userId', 'published'] },
});

// Create instance (works with both IndexedDB and LocalStorage!)
const db = new Deposit({
  type: 'indexedDB', // or 'localStorage'
  dbName: 'my-app',
  version: 1,
  schema,
});

// Type-safe operations with powerful querying
const admins = await db.query('users')
  .where('role', '=', 'admin')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .toArray();
```

## ✨ Features

- ✅ **Type-Safe** – Full TypeScript support with schema-based type inference
- ✅ **Unified API** – Switch between IndexedDB and LocalStorage without changing code
- ✅ **Advanced Querying** – Rich QueryBuilder with filters, sorting, grouping, and pagination
- ✅ **Schema Validation** – Early validation with clear error messages
- ✅ **TTL Support** – Native time-to-live for automatic record expiration
- ✅ **Transactions** – Atomic operations across multiple tables
- ✅ **Migrations** – Built-in schema versioning for IndexedDB
- ✅ **Resilient** – Graceful handling of corrupted entries
- ✅ **Lightweight** – 4.4 KB gzipped
- ✅ **Zero Runtime Dependencies** – Only development dependencies for utilities

## 🆚 Comparison with Alternatives

| Feature              | Deposit        | Dexie.js    | LocalForage | Native IndexedDB |
| -------------------- | -------------- | ----------- | ----------- | ---------------- |
| TypeScript Support   | ✅ First-class | ✅ Good     | ⚠️ Limited  | ❌               |
| Query Builder        | ✅ Advanced    | ✅ Good     | ❌          | ❌               |
| Migrations           | ✅ Built-in    | ✅ Advanced | ❌          | ⚠️ Manual        |
| LocalStorage Support | ✅ Unified API | ❌          | ✅          | ❌               |
| Bundle Size (gzip)   | **~4.5 KB**    | ~20KB       | ~8KB        | 0KB              |
| TTL Support          | ✅ Native      | ❌          | ❌          | ❌               |
| Transactions         | ✅ Atomic*     | ✅ Yes      | ❌          | ✅ Complex       |
| Schema Validation    | ✅ Built-in    | ⚠️ Runtime  | ❌          | ❌               |
| Dependencies         | 1              | 0           | 0           | N/A              |

\* Transactions are fully atomic for IndexedDB, optimistic for LocalStorage

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/deposit
# npm
npm install @vielzeug/deposit
# yarn
yarn add @vielzeug/deposit
```

## 🚀 Quick Start

### Define Your Schema

```typescript
import { Deposit, defineSchema } from '@vielzeug/deposit';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
  createdAt: number;
}

interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: number;
}

// Clean, type-safe schema definition
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id', // Primary key field
    indexes: ['email', 'role'], // Fields to index for fast lookups
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'published', 'createdAt'],
  },
});
```

### Create a Depot Instance

```typescript
// Option 1: IndexedDB (recommended for production)
const db = new Deposit({
  type: 'indexedDB',
  dbName: 'my-app-db',
  version: 1,
  schema,
});

// Option 2: LocalStorage (simpler, smaller storage)
const db = new Deposit({
  type: 'localStorage',
  dbName: 'my-app-db',
  version: 1,
  schema,
});

// Option 3: Custom adapter
import { IndexedDBAdapter } from '@vielzeug/deposit';
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);
```

### Basic CRUD Operations

```typescript
// Create/Update
await db.put('users', {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  role: 'admin',
  createdAt: Date.now(),
});

// Read
const user = await db.get('users', 'u1');
console.log(user?.name); // 'Alice'

// Read all
const allUsers = await db.getAll('users');

// Delete
await db.delete('users', 'u1');

// Bulk operations
await db.bulkPut('users', [user1, user2, user3]);
await db.bulkDelete('users', ['u1', 'u2', 'u3']);

// Clear table
await db.clear('users');

// Count
const count = await db.count('users');
```

## 🎓 Core Concepts

### Schema Definition

Deposit uses a type-safe schema definition to validate your data structure:

```typescript
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id',           // Primary key field
    indexes: ['email'],  // Optional indexed fields for fast lookups
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
  },
});
```

### Adapters

Deposit supports two storage adapters:

- **IndexedDBAdapter**: Full-featured with transactions, migrations, and large storage capacity
- **LocalStorageAdapter**: Simple key-value storage with 5-10MB limit

Switch between them without changing your code!

### Type Safety

All operations are fully type-safe based on your schema:

```typescript
// ✅ TypeScript knows the shape of user
const user = await db.get('users', 'u1');
user?.name; // string
user?.age;  // number

// ❌ TypeScript error – 'posts' table doesn't have 'email' field
const post = await db.get('posts', 'p1');
post?.email; // Error!
```

## 🎯 API Reference

See the [full API documentation](https://helmuthdu.github.io/vielzeug/deposit/api) for complete details.

### Core Methods

- `get(table, key, defaultValue?)` – Get a single record
- `getAll(table)` – Get all records from a table
- `put(table, value, ttl?)` – Create or update a record
- `delete(table, key)` – Delete a record
- `clear(table)` – Clear all records from a table
- `count(table)` – Count records in a table
- `bulkPut(table, values, ttl?)` – Bulk insert/update
- `bulkDelete(table, keys)` – Bulk delete
- `query(table)` – Create a query builder
- `transaction(tables, fn, ttl?)` – Atomic transaction
- `patch(table, operations)` – Batch operations

## 🔥 Advanced Features

### Query Builder

Build complex queries with a fluent, type-safe API:

```typescript
// Simple filtering
const admins = await db.query('users').equals('role', 'admin').orderBy('name', 'asc').toArray();

// Complex filtering
const results = await db
  .query('users')
  .filter((user) => user.age > 18 && user.email.includes('example.com'))
  .orderBy('createdAt', 'desc')
  .limit(10)
  .toArray();

// Range queries
const youngAdults = await db.query('users').between('age', 18, 30).toArray();

// Pagination
const page2 = await db
  .query('users')
  .orderBy('name', 'asc')
  .page(2, 20) // Page 2, 20 items per page
  .toArray();

// Aggregations
const avgAge = await db.query('users').average('age');
const oldestUser = await db.query('users').max('age');
const totalUsers = await db.query('users').count();

// Type-safe grouping (recommended)
const byRole = await db.query('users').toGrouped('role');
// Result: Array<{ key: 'admin' | 'user', values: User[] }>
for (const group of byRole) {
  console.log(`${group.key}: ${group.values.length} users`);
}

// Search
const results = await db.query('users').search('alice').toArray();
```

### TTL (Time-To-Live)

Records automatically expire and are cleaned up:

```typescript
// Session expires in 1 hour
await db.put(
  'sessions',
  {
    id: 's1',
    userId: 'u1',
    token: 'abc123',
    createdAt: Date.now(),
  },
  3600000, // TTL in milliseconds
);

// After 1 hour, this returns undefined
const session = await db.get('sessions', 's1'); // undefined

// TTL with bulk operations
await db.bulkPut('temp-data', records, 3600000);
```

### Transactions

Perform operations across multiple tables. Transactions are **atomic for IndexedDB** (all succeed or all fail) and **optimistic for LocalStorage**:

```typescript
await db.transaction(['users', 'posts'], async (stores) => {
  // Add a user
  stores.users.push({
    id: 'u5',
    name: 'Eve',
    email: 'eve@example.com',
    age: 22,
    role: 'user',
    createdAt: Date.now(),
  });

  // Add their first post
  stores.posts.push({
    id: 'p1',
    userId: 'u5',
    title: 'Hello World',
    content: 'My first post!',
    published: true,
    createdAt: Date.now(),
  });

  // For IndexedDB: Changes are committed atomically in a single transaction
  // For LocalStorage: Changes are committed optimistically (non-atomic)
  // If any error occurs, all changes are rolled back
});
```

### Schema Migrations (IndexedDB)

Handle schema changes gracefully:

```typescript
const migrationFn = (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 2) {
    // Version 1 -> 2: Add default role to existing users
    const store = tx.objectStore('users');
    const request = store.getAll();

    request.onsuccess = () => {
      for (const user of request.result) {
        if (!user.role) {
          user.role = 'user';
          store.put(user);
        }
      }
    };
  }
};

const db = new Deposit({
  type: 'indexedDB',
  dbName: 'my-app-db',
  version: 2, // Increment version to trigger migration
  schema,
  migrationFn,
});
```

### Patch Operations

Apply multiple operations atomically:

```typescript
await db.patch('users', [
  {
    type: 'put',
    value: { id: 'u6', name: 'Frank', email: 'f@example.com', age: 40, role: 'user', createdAt: Date.now() },
  },
  {
    type: 'put',
    value: { id: 'u7', name: 'Grace', email: 'g@example.com', age: 33, role: 'admin', createdAt: Date.now() },
    ttl: 3600000,
  },
  { type: 'delete', key: 'u2' },
]);
```

## API Reference

### Deposit Class

#### Methods

- `put(table, value, ttl?)` – Insert or update a record
- `get(table, key, defaultValue?)` – Retrieve a record by key
- `getAll(table)` – Retrieve all records from a table
- `delete(table, key)` – Delete a record
- `clear(table)` – Remove all records from a table
- `count(table)` – Count records in a table
- `bulkPut(table, values, ttl?)` – Insert/update multiple records
- `bulkDelete(table, keys)` – Delete multiple records
- `query(table)` – Create a QueryBuilder for advanced queries
- `transaction(tables, fn, ttl?)` – Execute atomic operations
- `patch(table, operations)` – Apply multiple operations atomically

### QueryBuilder Methods

#### Filtering

- `equals(field, value)` – Filter by exact match
- `between(field, lower, upper)` – Filter by range
- `startsWith(field, prefix, ignoreCase?)` – Filter by string prefix
- `where(field, predicate)` – Filter with custom predicate
- `filter(fn)` – Filter with predicate on entire record
- `not(fn)` – Negate a predicate
- `and(...fns)` – Combine predicates with AND
- `or(...fns)` – Combine predicates with OR

#### Ordering & Pagination

- `orderBy(field, direction)` – Sort results
- `limit(n)` – Limit number of results
- `offset(n)` – Skip first n results
- `page(pageNumber, pageSize)` – Paginate results
- `reverse()` – Reverse order

#### Aggregations

- `count()` – Count matching records
- `first()` – Get first record
- `last()` – Get last record
- `min(field)` – Find minimum value
- `max(field)` – Find maximum value
- `sum(field)` – Sum numeric field
- `average(field)` – Calculate average

#### Transformations

- `modify(callback)` – Transform records
- `groupBy(field)` – Group by field (returns object)
- `toGrouped(field)` – Type-safe grouping (returns array) – **Recommended**
- `search(query, tone?)` – Fuzzy search

#### Execution

- `toArray()` – Execute query and return results
- `reset()` – Clear all operations
- `build(conditions)` – Build query from condition objects

## Schema Validation

Deposit validates your schema on initialization to catch errors early:

```typescript
// ✅ Valid schema
const validSchema = {
  users: {
    key: 'id',
    record: {} as User,
  },
};

// ❌ Invalid schema – will throw immediately
const invalidSchema = {
  users: {
    record: {} as User, // Missing 'key' field
  },
};

// Error: "Invalid schema: table "users" missing required "key" field.
//         Schema entries must have shape: { key: K, record: T, indexes?: K[] }"
```

## Error Handling

Deposit gracefully handles errors and corrupted data:

```typescript
// Corrupted localStorage entries are:
// 1. Skipped automatically
// 2. Deleted from storage
// 3. Logged as warnings
// 4. Don't break batch operations

const users = await db.getAll('users');
// ✅ Returns all valid users, skips corrupted ones
```

## TypeScript Support

Full type inference from your schema:

```typescript
const schema = {
  users: {
    key: 'id',
    record: {} as User,
  },
} satisfies DepositDataSchema;

const db = new Deposit({ type: 'localStorage', dbName: 'app', version: 1, schema });

// ✅ Type-safe: knows user is User | undefined
const user = await db.get('users', 'u1');

// ✅ Type-safe: knows this returns User[]
const users = await db.query('users').toArray();

// ✅ Type-safe: knows result is Array<{ key: string, values: User[] }>
const grouped = await db.query('users').toGrouped('role');

// ❌ Type error: 'invalid' is not a valid table
await db.get('invalid', 'key');
```

## Best Practices

1. **Use IndexedDB for production** – Better performance and larger storage
2. **Define schemas with TypeScript** – Use `{} as YourType` for full type safety
3. **Index wisely** – Only index fields you'll query frequently
4. **Batch operations** – Use `bulkPut`/`bulkDelete` instead of loops
5. **Use `toGrouped()`** – Prefer it over `groupBy()` for type safety
6. **Handle errors** – Wrap operations in try-catch for error handling
7. **Increment versions** – For schema changes in IndexedDB

## Examples

### Todo App

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

const schema = {
  todos: {
    key: 'id',
    indexes: ['completed', 'createdAt'],
    record: {} as Todo,
  },
};

const db = new Deposit({
  type: 'indexedDB',
  dbName: 'todos-db',
  version: 1,
  schema,
});

// Add todo
await db.put('todos', {
  id: crypto.randomUUID(),
  text: 'Learn Deposit',
  completed: false,
  createdAt: Date.now(),
});

// Get active todos
const activeTodos = await db.query('todos').equals('completed', false).orderBy('createdAt', 'desc').toArray();

// Mark as completed
const todo = await db.get('todos', 'todo-id');
if (todo) {
  await db.put('todos', { ...todo, completed: true });
}

// Delete completed
const completed = await db.query('todos').equals('completed', true).toArray();
await db.bulkDelete(
  'todos',
  completed.map((t) => t.id),
);
```

### Session Management with TTL

```typescript
interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
}

const schema = {
  sessions: {
    key: 'id',
    indexes: ['userId'],
    record: {} as Session,
  },
};

const db = new Deposit({
  type: 'indexedDB',
  dbName: 'auth-db',
  version: 1,
  schema,
});

// Create session with 1-hour TTL
await db.put(
  'sessions',
  {
    id: crypto.randomUUID(),
    userId: 'u1',
    token: 'secure-token',
    expiresAt: Date.now() + 3600000,
  },
  3600000, // Auto-delete after 1 hour
);

// Get current session
const session = await db.get('sessions', 'session-id');
if (!session) {
  // Session expired or doesn't exist
  console.log('Please log in');
}
```

## Browser Support

- Chrome/Edge 24+
- Firefox 29+
- Safari 10+
- All modern browsers with IndexedDB and LocalStorage support

## 📖 Documentation

- [**Full Documentation**](https://helmuthdu.github.io/vielzeug/deposit)
- [**Usage Guide**](https://helmuthdu.github.io/vielzeug/deposit/usage)
- [**API Reference**](https://helmuthdu.github.io/vielzeug/deposit/api)
- [**Examples**](https://helmuthdu.github.io/vielzeug/deposit/examples)

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🤝 Contributing

Contributions are welcome! Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 🔗 Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://helmuthdu.github.io/vielzeug/deposit)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/deposit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem – A collection of type-safe utilities for modern web development.
