---
title: Deposit — Usage Guide
description: Schema definition, adapters, query builder, and testing for createDeposit.
---

# Deposit Usage Guide

::: tip New to Deposit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Deposit?

Persistent client-side storage with structured queries is essential for offline-capable apps. Deposit gives you a typed query builder on top of LocalStorage or IndexedDB.

```ts
// Before — manual localStorage
const raw = localStorage.getItem('users');
const users = raw ? JSON.parse(raw) as User[] : [];
const adults = users.filter(u => u.age >= 18).sort((a, b) => a.name.localeCompare(b.name));

// After — Deposit
const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();
```

| Feature | Deposit | localforage | dexie |
|---|---|---|---|
| Bundle size | <PackageInfo package="deposit" type="size" /> | ~8 kB | ~23 kB |
| Query builder | ✅ Rich | ❌ | ✅ |
| TypeScript | ✅ First-class | ⚠️ | ✅ |
| Multiple adapters | ✅ | ✅ | IndexedDB only |
| Zero dependencies | ✅ | ❌ | ❌ |

**Use Deposit when** you need typed storage with querying capability and don't need full IndexedDB power of Dexie.


## Import

```ts
import { createDeposit, defineSchema, LocalStorageAdapter, IndexedDBAdapter } from '@vielzeug/deposit';
// Optional: Import types
import type { DepositDataSchema, DepositMigrationFn, DepositBaseAdapter } from '@vielzeug/deposit';
```

## Basic Usage

### Define a Schema

The schema defines your tables, their primary keys, indexes, and record types:

```ts
import { defineSchema } from '@vielzeug/deposit';

// Define your record types
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
  createdAt: number;
}

// Define the schema with type-safe helper
const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id', // Primary key field
    indexes: ['email', 'role'], // Indexed fields for fast lookups
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
  },
});
```

### Initialize Deposit

#### Using LocalStorage

LocalStorage is simpler but has a smaller storage limit (~5-10MB):

```ts
const adapter = new LocalStorageAdapter('my-app-db', schema);
const db = createDeposit(adapter);

// Or use the shorthand config
const db = createDeposit({
  type: 'localStorage',
  dbName: 'my-app-db',
  version: 1,
  schema,
});
```

#### Using IndexedDB

IndexedDB is more powerful with larger storage and index support:

```ts
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = createDeposit(adapter);

// With migration function
const adapterWithMigration = new IndexedDBAdapter('my-app-db', 1, schema, (db, oldVersion, newVersion, tx, schema) => {
  // Migration logic here
});

// Or use the shorthand config
const db = createDeposit({
  type: 'indexedDB',
  dbName: 'my-app-db',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx, schema) => {
    // Migration logic
  },
});
```

### Basic Operations

#### Insert/Update Records

```ts
// Insert a single user
await db.put('users', {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  role: 'admin',
  createdAt: Date.now(),
});

// Update (just put with same id)
await db.put('users', {
  id: 'u1',
  name: 'Alice Smith', // Updated name
  email: 'alice@example.com',
  age: 31, // Updated age
  role: 'admin',
  createdAt: Date.now(),
});
```

#### Retrieve Records

```ts
// Get a single user
const user = await db.get('users', 'u1');
if (user) {
  console.log(user.name);
}

// Get with default value
const user = await db.get('users', 'u1', {
  id: 'u1',
  name: 'Guest',
  email: '',
  age: 0,
  role: 'user',
  createdAt: Date.now(),
});

// Get all users
const allUsers = await db.getAll('users');
console.log(`Found ${allUsers.length} users`);
```

#### Delete Records

```ts
// Delete a single user
await db.delete('users', 'u1');

// Clear all users
await db.clear('users');
```

#### Count Records

```ts
const userCount = await db.count('users');
console.log(`Total users: ${userCount}`);
```

## Bulk Operations

### Bulk Insert/Update

```ts
const newUsers = [
  { id: 'u2', name: 'Bob', email: 'bob@example.com', age: 25, role: 'user', createdAt: Date.now() },
  { id: 'u3', name: 'Carol', email: 'carol@example.com', age: 28, role: 'user', createdAt: Date.now() },
  { id: 'u4', name: 'Dave', email: 'dave@example.com', age: 35, role: 'admin', createdAt: Date.now() },
];

await db.bulkPut('users', newUsers);
```

### Bulk Delete

```ts
await db.bulkDelete('users', ['u2', 'u3', 'u4']);
```

## Advanced Features

### TTL (Time-To-Live)

Records can automatically expire after a specified time:

```ts
// Session expires in 1 hour (3600000 ms)
await db.put(
  'sessions',
  {
    id: 's1',
    userId: 'u1',
    token: 'abc123',
    createdAt: Date.now(),
  },
  3600000,
);

// After 1 hour, this returns undefined
const session = await db.get('sessions', 's1'); // undefined

// TTL with bulk operations
await db.bulkPut('temp-data', records, 3600000);
```

### Query Builder

Build complex queries with a fluent API:

```ts
// Find all admin users sorted by name
const admins = await db.query('users').equals('role', 'admin').orderBy('name', 'asc').toArray();

// Find users between ages 20-30
const youngUsers = await db.query('users').between('age', 20, 30).toArray();

// Complex filtering
const special = await db
  .query('users')
  .filter((user) => user.age > 18 && user.email.includes('example.com'))
  .orderBy('createdAt', 'desc')
  .limit(10)
  .toArray();

// Pagination
const page2 = await db
  .query('users')
  .orderBy('name', 'asc')
  .page(2, 10) // Page 2, 10 items per page
  .toArray();

// Aggregations
const avgAge = await db.query('users').average('age');
const oldest = await db.query('users').max('age');
const youngest = await db.query('users').min('age');
const totalUsers = await db.query('users').count();

// Type-safe grouping
const byRoleTyped = await db.query('users').toGrouped('role');
// Result: Array<{ key: 'admin' | 'user', values: User[] }>
for (const group of byRoleTyped) {
  console.log(`${group.key}: ${group.values.length} users`);
}
```

::: tip 💡 Type-Safe Grouping
Use `toGrouped()` for type-safe grouping. It returns `Array<{ key: T[K], values: T[] }>` with full type inference.
:::

### Transactions

Perform operations across multiple tables with automatic atomicity for IndexedDB:

```ts
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
    createdAt: Date.now(),
  });

  // For IndexedDB: All changes committed atomically in a single transaction
  // For LocalStorage: Changes committed optimistically (non-atomic)
  // If any error occurs, all changes are rolled back
});
```

::: tip ⚡ Atomicity Guarantees

- **IndexedDB**: Transactions are fully atomic using a single `IDBTransaction` – all changes succeed together or all fail together (ACID properties)
- **LocalStorage**: Transactions are optimistic and NOT atomic – tables are updated sequentially. For critical data integrity, use IndexedDB
  :::

### Patch Operations

Apply multiple operations atomically:

```ts
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
  { type: 'clear' }, // Clears all, then applies puts
]);
```

## Schema Validation

Deposit automatically validates your schema on initialization to catch configuration errors early:

```ts
// ✅ Valid schema
const validSchema = defineSchema<{ users: User }>()({
  users: { key: 'id', indexes: ['email'] },
});

// ❌ Invalid schema – missing key field
const invalidSchema = {
  users: {}, // Missing 'key' field
};

// This will throw immediately with a clear error message:
// "Invalid schema: table "users" missing required "key" field.
//  Schema entries must have shape: { key: K; indexes?: K[] }"
const db = createDeposit({
  type: 'localStorage',
  dbName: 'my-app',
  schema: invalidSchema, // ❌ Throws error
});
```

::: tip 💡 Early Error Detection
Schema validation happens in the constructor, so you'll catch configuration errors immediately rather than at runtime when accessing data. This makes debugging much easier.
:::

### Safe Storage Keys

Deposit uses `encodeURIComponent` for storage keys, safely handling special characters including colons in database and table names:

```ts
// These all work correctly, even with special characters
const db1 = createDeposit({
  type: 'localStorage',
  dbName: 'my:app:db', // ✅ Colons are safely encoded
  schema,
});

const schema2 = {
  'user:data': {
    // ✅ Colons in table names work too
    key: 'id',
  },
};
```

### Corrupted Entry Handling

Deposit gracefully handles corrupted localStorage entries without breaking batch operations:

```ts
// If a single entry is corrupted in localStorage
// getAll() will:
// 1. Skip the corrupted entry
// 2. Delete it automatically
// 3. Log a warning
// 4. Continue processing other entries
// 5. Return all valid entries

const users = await db.getAll('users');
// ✅ Returns all valid users, skips corrupted ones
```

## Schema Migrations

When using IndexedDB, you can migrate data when the schema changes:

```ts
const migrationFn: DepositMigrationFn<typeof schema> = (db, oldVersion, newVersion, tx, schema) => {
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

  if (oldVersion < 3) {
    // Version 2 -> 3: Add createdAt to posts
    const store = tx.objectStore('posts');
    const request = store.getAll();

    request.onsuccess = () => {
      for (const post of request.result) {
        if (!post.createdAt) {
          post.createdAt = Date.now();
          store.put(post);
        }
      }
    };
  }
};

const adapter = new IndexedDBAdapter('my-app-db', 3, schema, migrationFn);
const db = createDeposit(adapter);
```

## Environment-Specific Configuration

### Development

```ts
const db = createDeposit({
  type: 'localStorage', // Faster for development
  dbName: 'my-app-dev',
  version: 1,
  schema,
});
```

### Production

```ts
const db = createDeposit({
  type: 'indexedDB', // More robust for production
  dbName: 'my-app-prod',
  version: 1,
  schema,
  migrationFn,
});
```

### Testing

```ts
beforeEach(async () => {
  const db = createDeposit({
    type: 'localStorage',
    dbName: `test-${Date.now()}`, // Unique per test
    version: 1,
    schema,
  });

  await db.clear('users');
  await db.clear('posts');
});
```

## Best Practices

1. **Define schemas with TypeScript**: Use `{} as YourType` for full type safety
2. **Use indexes wisely**: Only index fields you'll query frequently
3. **Batch operations**: Use `bulkPut`/`bulkDelete` instead of loops
4. **Handle errors**: Wrap operations in try-catch for error handling
5. **Clean up expired data**: Regularly query and delete old records
6. **Use TTL for temporary data**: Sessions, caches, temporary files
7. **Version your schemas**: Increment version when structure changes
8. **Test migrations**: Always test migration logic thoroughly
9. **Monitor storage quota**: Check available space before large operations
10. **Clear on logout**: Remove sensitive data when user logs out

## Common Patterns

### Caching API Responses

```ts
// Cache with 5-minute TTL
async function fetchWithCache(url: string) {
  const cached = await db.get('api-cache', url);
  if (cached) return cached.data;

  const response = await fetch(url);
  const data = await response.json();

  await db.put(
    'api-cache',
    {
      id: url,
      data,
      fetchedAt: Date.now(),
    },
    300000,
  ); // 5 minutes

  return data;
}
```

### Offline Queue

```ts
// Queue offline actions
async function saveForLater(action: any) {
  await db.put('offline-queue', {
    id: crypto.randomUUID(),
    action,
    createdAt: Date.now(),
  });
}

// Process queue when online
async function processQueue() {
  const queue = await db.getAll('offline-queue');

  for (const item of queue) {
    try {
      await processAction(item.action);
      await db.delete('offline-queue', item.id);
    } catch (err) {
      console.error('Failed to process', item.id, err);
    }
  }
}
```

### Search with Autocomplete

```ts
async function searchUsers(query: string) {
  return await db
    .query('users')
    .search(query) // Fuzzy search
    .limit(10)
    .toArray();
}
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
