# Deposit Usage Guide

Complete guide to installing and using Deposit in your projects.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/deposit
```

```sh [npm]
npm install @vielzeug/deposit
```

```sh [yarn]
yarn add @vielzeug/deposit
```

:::

## Import

```ts
import { Deposit, LocalStorageAdapter, IndexedDBAdapter } from '@vielzeug/deposit';
// Optional: Import types
import type { DepositDataSchema, DepositMigrationFn } from '@vielzeug/deposit';
```

## Define a Schema

The schema defines your tables, their primary keys, indexes, and record types:

```ts
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

// Define the schema
const schema = {
  users: {
    key: 'id', // Primary key field
    indexes: ['email', 'role'], // Indexed fields for fast lookups
    record: {} as User, // Type assertion for the record
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
    record: {} as Post,
  },
} satisfies DepositDataSchema;
```

## Create a Deposit Instance

### Using LocalStorage

LocalStorage is simpler but has a smaller storage limit (~5-10MB):

```ts
const adapter = new LocalStorageAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);

// Or use the shorthand config
const db = new Deposit({
  type: 'localStorage',
  dbName: 'my-app-db',
  version: 1,
  schema,
});
```

### Using IndexedDB

IndexedDB is more powerful with larger storage and index support:

```ts
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);

// With migration function
const adapter = new IndexedDBAdapter('my-app-db', 1, schema, (db, oldVersion, newVersion, tx, schema) => {
  // Migration logic here
});

// Or use the shorthand config
const db = new Deposit({
  type: 'indexedDB',
  dbName: 'my-app-db',
  version: 1,
  schema,
  migrationFn: (db, oldVersion, newVersion, tx, schema) => {
    // Migration logic
  },
});
```

## Basic Operations

### Insert/Update Records

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

### Retrieve Records

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

### Delete Records

```ts
// Delete a single user
await db.delete('users', 'u1');

// Clear all users
await db.clear('users');
```

### Count Records

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
```

### Transactions

Perform atomic operations across multiple tables:

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

  // Both changes are committed together
  // If any error occurs, all changes are rolled back
});
```

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
const db = new Deposit(adapter);
```

## Environment-Specific Configuration

### Development

```ts
const db = new Deposit({
  type: 'localStorage', // Faster for development
  dbName: 'my-app-dev',
  version: 1,
  schema,
});
```

### Production

```ts
const db = new Deposit({
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
  const db = new Deposit({
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

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples.md) - Practical code examples
