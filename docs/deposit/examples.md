# Deposit Examples

Practical examples showing common use cases and patterns.

::: tip 💡 Complete Applications
These are complete application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

- [Basic Setup](#basic-setup)
- [CRUD Operations](#crud-operations)
- [Advanced Queries](#advanced-queries)
- [Transactions](#transactions)
- [Migrations](#migrations)
- [Real-World Patterns](#real-world-patterns)

## Basic Setup

### Define Schema

```ts
import { Deposit, IndexedDBAdapter, type DepositDataSchema } from '@vielzeug/deposit';

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

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
}

const schema = {
  users: {
    key: 'id',
    indexes: ['email', 'role'],
    record: {} as User,
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'published', 'createdAt'],
    record: {} as Post,
  },
  sessions: {
    key: 'id',
    indexes: ['userId'],
    record: {} as Session,
  },
} satisfies DepositDataSchema;
```

### Create Instance

::: warning 🔍 Choosing an Adapter
- **IndexedDB**: Recommended for production (larger storage, better performance)
- **LocalStorage**: Simple apps with small data (<5MB)
- Use the shorthand config for quick setup
:::

::: code-group

```ts [IndexedDB]
// IndexedDB (recommended for production)
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);
```

```ts [LocalStorage]
// LocalStorage (simpler, smaller storage)
const adapter = new LocalStorageAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);
```

```ts [Shorthand]
// Or use shorthand config
const db = new Deposit({
  type: 'indexedDB',
  dbName: 'my-app-db',
  version: 1,
  schema,
});
```

:::

## Basic CRUD Operations

### Insert Records

```ts
// Single insert
await db.put('users', {
  id: crypto.randomUUID(),
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  role: 'admin',
  createdAt: Date.now(),
});

// Bulk insert
const newUsers = [
  { id: crypto.randomUUID(), name: 'Bob', email: 'bob@example.com', age: 25, role: 'user', createdAt: Date.now() },
  { id: crypto.randomUUID(), name: 'Carol', email: 'carol@example.com', age: 28, role: 'user', createdAt: Date.now() },
  { id: crypto.randomUUID(), name: 'Dave', email: 'dave@example.com', age: 35, role: 'admin', createdAt: Date.now() },
];

await db.bulkPut('users', newUsers);
```

### Read Records

```ts
// Get by ID
const user = await db.get('users', 'user-id');
if (user) {
  console.log(user.name);
}

// Get with default
const guestUser = await db.get('users', 'unknown-id', {
  id: 'guest',
  name: 'Guest',
  email: '',
  age: 0,
  role: 'user',
  createdAt: Date.now(),
});

// Get all
const allUsers = await db.getAll('users');

// Count
const totalUsers = await db.count('users');
```

### Update Records

```ts
// Get, modify, put
const user = await db.get('users', 'user-id');
if (user) {
  user.age = 31;
  user.name = 'Alice Smith';
  await db.put('users', user);
}

// Or create new object
await db.put('users', {
  id: 'user-id',
  name: 'Alice Smith',
  email: 'alice@example.com',
  age: 31,
  role: 'admin',
  createdAt: Date.now(),
});
```

### Delete Records

```ts
// Single delete
await db.delete('users', 'user-id');

// Bulk delete
await db.bulkDelete('users', ['id1', 'id2', 'id3']);

// Clear table
await db.clear('users');
```

## Query Builder Examples

### Basic Filtering

```ts
// Find all admins
const admins = await db.query('users').equals('role', 'admin').toArray();

// Find users in age range
const youngAdults = await db.query('users').between('age', 18, 30).toArray();

// Find by string prefix
const aliceUsers = await db.query('users').startsWith('name', 'Alice', true).toArray();

// Custom filtering
const verified = await db
  .query('users')
  .where('email', (email) => email.endsWith('@company.com'))
  .toArray();

// Complex filter
const special = await db
  .query('users')
  .filter((user) => user.age > 25 && user.role === 'admin')
  .toArray();
```

### Sorting and Pagination

```ts
// Sort by name
const sorted = await db.query('users').orderBy('name', 'asc').toArray();

// Sort descending
const newest = await db.query('users').orderBy('createdAt', 'desc').toArray();

// Limit results
const topTen = await db.query('users').orderBy('age', 'desc').limit(10).toArray();

// Offset
const skipFirst10 = await db.query('users').offset(10).limit(10).toArray();

// Pagination
const page2 = await db
  .query('users')
  .orderBy('name', 'asc')
  .page(2, 20) // Page 2, 20 per page
  .toArray();

// Reverse
const reversed = await db.query('users').orderBy('name', 'asc').reverse().toArray();
```

### Aggregations

```ts
// Count
const userCount = await db.query('users').equals('role', 'admin').count();

// First and last
const firstUser = await db.query('users').orderBy('createdAt', 'asc').first();

const lastUser = await db.query('users').orderBy('createdAt', 'asc').last();

// Numeric aggregations
const avgAge = await db.query('users').average('age');
const minAge = await db.query('users').min('age');
const maxAge = await db.query('users').max('age');
const totalAge = await db.query('users').sum('age');
```

### Logical Operators

```ts
// NOT
const nonAdmins = await db
  .query('users')
  .not((user) => user.role === 'admin')
  .toArray();

// AND
const seniorAdmins = await db
  .query('users')
  .and(
    (user) => user.role === 'admin',
    (user) => user.age >= 30,
  )
  .toArray();

// OR
const either = await db
  .query('users')
  .or(
    (user) => user.role === 'admin',
    (user) => user.age >= 50,
  )
  .toArray();
```

### Transformations

```ts
// Modify results
const uppercased = await db
  .query('users')
  .modify((user) => ({
    ...user,
    name: user.name.toUpperCase(),
  }))
  .toArray();

// Group by field
const byRole = await db.query('users').groupBy('role').toArray();

// Search
const searchResults = await db.query('users').search('alice').toArray();
```

### Chaining Multiple Operations

```ts
const result = await db
  .query('users')
  .filter((u) => u.age >= 18)
  .equals('role', 'admin')
  .orderBy('name', 'asc')
  .limit(10)
  .toArray();
```

## TTL (Time-To-Live) Examples

::: tip TTL Feature
Records with TTL automatically expire and are removed when accessed after the TTL period.
:::

### Session Management

```ts
// Create session with 1-hour expiry
await db.put(
  'sessions',
  {
    id: crypto.randomUUID(),
    userId: 'user-id',
    token: 'abc123',
    expiresAt: Date.now() + 3600000,
  },
  3600000,
); // TTL: 1 hour

// After 1 hour, this returns undefined
const session = await db.get('sessions', 'session-id');
```

### API Cache

```ts
// Cache API response for 5 minutes
async function fetchWithCache(url: string) {
  const cacheKey = btoa(url);
  const cached = await db.get('api-cache', cacheKey);

  if (cached) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();

  await db.put(
    'api-cache',
    {
      id: cacheKey,
      url,
      data,
      cachedAt: Date.now(),
    },
    300000,
  ); // 5 minutes

  return data;
}
```

### Temporary Files

```ts
// Store temp data for 30 minutes
await db.put(
  'temp-files',
  {
    id: 'temp-123',
    content: 'temporary data',
    createdAt: Date.now(),
  },
  1800000,
); // 30 minutes
```

## Transaction Examples

### User Registration

```ts
// Create user and their first post atomically
await db.transaction(['users', 'posts'], async (stores) => {
  const userId = crypto.randomUUID();

  // Add user
  stores.users.push({
    id: userId,
    name: 'New User',
    email: 'new@example.com',
    age: 25,
    role: 'user',
    createdAt: Date.now(),
  });

  // Add welcome post
  stores.posts.push({
    id: crypto.randomUUID(),
    userId,
    title: 'Welcome!',
    content: 'Thanks for joining!',
    published: true,
    createdAt: Date.now(),
  });
});
```

### Data Migration

```ts
// Move data from one table structure to another
await db.transaction(['users', 'profiles'], async (stores) => {
  // Create profiles from users
  for (const user of stores.users) {
    stores.profiles.push({
      id: crypto.randomUUID(),
      userId: user.id,
      bio: '',
      avatar: '',
      createdAt: Date.now(),
    });
  }
});
```

## Patch Operations Examples

### Batch Updates

```ts
const patches = [
  // Add new user
  {
    type: 'put' as const,
    value: {
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
      role: 'admin' as const,
      createdAt: Date.now(),
    },
  },
  // Add another with TTL
  {
    type: 'put' as const,
    value: {
      id: 'u2',
      name: 'Bob',
      email: 'bob@example.com',
      age: 25,
      role: 'user' as const,
      createdAt: Date.now(),
    },
    ttl: 3600000,
  },
  // Delete old user
  { type: 'delete' as const, key: 'old-user-id' },
];

await db.patch('users', patches);
```

### Sync from Server

```ts
async function syncFromServer() {
  const serverData = await fetch('/api/sync').then((r) => r.json());

  const patches = [
    { type: 'clear' as const }, // Clear existing data
    ...serverData.map((item) => ({
      type: 'put' as const,
      value: item,
    })),
  ];

  await db.patch('users', patches);
}
```

## Real-World Patterns

### Offline-First Todo App

```ts
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

const db = new Deposit({ type: 'indexedDB', dbName: 'todos', version: 1, schema });

// Add todo
async function addTodo(text: string) {
  await db.put('todos', {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  });
}

// Toggle completion
async function toggleTodo(id: string) {
  const todo = await db.get('todos', id);
  if (todo) {
    await db.put('todos', { ...todo, completed: !todo.completed });
  }
}

// Get active todos
async function getActiveTodos() {
  return await db.query('todos').equals('completed', false).orderBy('createdAt', 'desc').toArray();
}

// Delete completed
async function clearCompleted() {
  const completed = await db.query('todos').equals('completed', true).toArray();

  await db.bulkDelete(
    'todos',
    completed.map((t) => t.id),
  );
}
```

### User Preferences

```ts
interface Preference {
  id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  updatedAt: number;
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'preferences',
  version: 1,
  schema: {
    prefs: {
      key: 'id',
      record: {} as Preference,
    },
  },
});

// Save preferences
async function savePreferences(prefs: Omit<Preference, 'id' | 'updatedAt'>) {
  await db.put('prefs', {
    id: 'user-prefs',
    ...prefs,
    updatedAt: Date.now(),
  });
}

// Load preferences
async function loadPreferences() {
  return await db.get('prefs', 'user-prefs', {
    id: 'user-prefs',
    theme: 'light',
    language: 'en',
    notifications: true,
    updatedAt: Date.now(),
  });
}
```

### Analytics Queue

```ts
interface Event {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  sent: boolean;
}

const db = new Deposit({
  type: 'indexedDB',
  dbName: 'analytics',
  version: 1,
  schema: {
    events: {
      key: 'id',
      indexes: ['sent', 'timestamp'],
      record: {} as Event,
    },
  },
});

// Track event
async function track(type: string, data: any) {
  await db.put('events', {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: Date.now(),
    sent: false,
  });
}

// Flush to server
async function flush() {
  const pending = await db.query('events').equals('sent', false).orderBy('timestamp', 'asc').toArray();

  if (pending.length === 0) return;

  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    });

    // Mark as sent
    for (const event of pending) {
      await db.put('events', { ...event, sent: true });
    }
  } catch (err) {
    console.error('Failed to flush analytics', err);
  }
}
```

### Data Export/Import

```ts
// Export all data
async function exportData() {
  const users = await db.getAll('users');
  const posts = await db.getAll('posts');

  return {
    version: 1,
    timestamp: Date.now(),
    data: { users, posts },
  };
}

// Import data
async function importData(exported: any) {
  await db.transaction(['users', 'posts'], async (stores) => {
    stores.users = exported.data.users;
    stores.posts = exported.data.posts;
  });
}
```

### Search and Autocomplete

```ts
async function searchUsers(query: string, limit = 10) {
  if (!query.trim()) {
    return await db.query('users').orderBy('name', 'asc').limit(limit).toArray();
  }

  return await db.query('users').search(query).limit(limit).toArray();
}
```

## Migration Examples

### Version 1 to 2: Add Field

```ts
const migration = (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 2) {
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
```

### Version 2 to 3: Transform Data

```ts
const migration = (db, oldVersion, newVersion, tx, schema) => {
  if (oldVersion < 3) {
    const store = tx.objectStore('posts');
    const request = store.getAll();

    request.onsuccess = () => {
      for (const post of request.result) {
        // Convert old format to new
        post.content = post.body || '';
        delete post.body;
        store.put(post);
      }
    };
  }
};
```

## Performance Tips

::: warning Performance
Always use bulk operations instead of loops for better performance.
:::

::: code-group

```ts [❌ Slow]
// Slow - multiple async operations
for (const user of users) {
  await db.put('users', user);
}
```

```ts [✅ Fast]
// Fast - single bulk operation
await db.bulkPut('users', users);
```

:::

::: tip Query Caching
Query results are automatically memoized for better performance.

```ts
const adminQuery = db.query('users').equals('role', 'admin');
const admins = await adminQuery.toArray(); // Cached
const adminCount = await adminQuery.count(); // Uses cache
```

:::
