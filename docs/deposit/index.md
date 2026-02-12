<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.5-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-4.4_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-2-success" alt="Dependencies">
</div>

<img src="/logo-deposit.svg" alt="Deposit Logo" width="156" class="logo-highlight"/>

# Deposit

**Deposit** is a powerful, type-safe browser storage utility for modern web apps. It provides a unified, developer-friendly API for **IndexedDB** and **LocalStorage**, featuring advanced querying, migrations, and transactions.

## What Problem Does Deposit Solve?

Browser storage APIs are powerful but notoriously complex. IndexedDB requires verbose boilerplate, lacks type safety, and has inconsistent error handling. LocalStorage is simple but limited to strings and lacks advanced features.

**Without Deposit**:

```ts
// IndexedDB - verbose and error-prone
const request = indexedDB.open('myDB', 1);
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  db.createObjectStore('users', { keyPath: 'id' });
};
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  store.add({ id: '1', name: 'Alice' });
};
```

**With Deposit**:

```ts
// Clean, type-safe, one-liner
await db.put('users', { id: '1', name: 'Alice' });
```

### Comparison with Alternatives

| Feature              | Deposit        | Dexie.js    | LocalForage | Native IndexedDB |
| -------------------- | -------------- | ----------- | ----------- | ---------------- |
| TypeScript Support   | ✅ First-class | ✅ Good     | ⚠️ Limited  | ❌               |
| Query Builder        | ✅ Advanced    | ✅ Good     | ❌          | ❌               |
| Migrations           | ✅ Built-in    | ✅ Advanced | ❌          | ⚠️ Manual        |
| LocalStorage Support | ✅ Unified API | ❌          | ✅          | ❌               |
| Bundle Size (gzip)   | **~4 KB**      | ~20KB       | ~8KB        | 0KB              |
| TTL Support          | ✅ Native      | ❌          | ❌          | ❌               |
| Transactions         | ✅ Yes         | ✅ Yes      | ❌          | ✅ Complex       |
| Schema Validation    | ✅ Built-in    | ⚠️ Runtime  | ❌          | ❌               |
| Dependencies         | 2              | 0           | 0           | N/A              |

## When to Use Deposit

**✅ Use Deposit when you:**

- Need type-safe client-side storage with autocompletion
- Want to abstract IndexedDB complexity without losing power
- Require advanced querying (filters, sorting, grouping)
- Need schema migrations for evolving data structures
- Want unified API across LocalStorage and IndexedDB
- Build offline-first or PWA applications

**❌ Consider alternatives when you:**

- Only need simple key-value storage (use LocalStorage directly)
- Already invested heavily in Dexie.js ecosystem
- Need extremely minimal bundle size (use native APIs)
- Building Node.js-only applications (use SQLite or other DB)

## 🚀 Key Features

- **Unified API**: Switch between LocalStorage and IndexedDB without changing your code
- **Type-safe**: Define your schemas once and enjoy full autocompletion and type checking
- **Schema Validation**: Early validation of schema structure with clear error messages
- **Advanced Querying**: Rich QueryBuilder with filters, sorting, grouping, pagination, and type-safe `toGrouped()`
- **Migrations**: Robust support for schema versioning and data migrations in IndexedDB
- **Transactions**: Ensure data integrity with atomic operations across multiple tables
- **TTL (Time-To-Live)**: Native support for automatic record expiration
- **Resilient**: Gracefully handles corrupted entries without breaking batch operations
- **Isomorphic**: Works in all modern browsers with minimal footprint
- **Minimal Dependencies**: Only @vielzeug/logit and @vielzeug/toolkit

## 🏁 Quick Start

### Installation

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

### Basic Setup

```ts
import { Deposit, IndexedDBAdapter } from '@vielzeug/deposit';

// 1. Define your schema with types
const schema = {
  users: {
    key: 'id',
    indexes: ['email'],
    record: {} as { id: string; name: string; email: string },
  },
  posts: {
    key: 'id',
    indexes: ['userId', 'createdAt'],
    record: {} as { id: string; userId: string; title: string; createdAt: number },
  },
};

// 2. Initialize the depot
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);

// 3. Start storing data
await db.put('users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
const user = await db.get('users', 'u1');
```

### Real-World Example: Todo App

```ts
import { Deposit, IndexedDBAdapter } from '@vielzeug/deposit';

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

const db = new Deposit(new IndexedDBAdapter('todos-db', 1, schema));

// Add todo
await db.put('todos', {
  id: crypto.randomUUID(),
  text: 'Learn Deposit',
  completed: false,
  createdAt: Date.now(),
});

// Query active todos
const activeTodos = await db.query('todos').equals('completed', false).orderBy('createdAt', 'desc').toArray();

// Update todo (put with same id)
const todo = await db.get('todos', 'todo-id');
if (todo) {
  await db.put('todos', { ...todo, completed: true });
}

// Delete completed todos
const completed = await db.query('todos').equals('completed', true).toArray();

await db.bulkDelete(
  'todos',
  completed.map((t) => t.id),
);
```

## 🎓 Core Concepts

### Schemas

Define your data structure with TypeScript types and indexes:

```ts
const schema = {
  tableName: {
    key: 'id', // Primary key field
    indexes: ['email'], // Fields to index for fast queries
    record: {} as MyType, // TypeScript type definition
  },
};
```

### Adapters

Choose between LocalStorage and IndexedDB based on your needs:

- **LocalStorage**: Simple, synchronous, ~10MB limit
- **IndexedDB**: Powerful, async, unlimited storage, transactions

### Query Builder

Chain methods to filter, sort, and transform your data:

```ts
await db.query('users').equals('role', 'admin').orderBy('createdAt', 'desc').limit(10).toArray();
```

### TTL (Time-To-Live)

Set automatic expiration on records:

```ts
await db.put('cache', data, 3600000); // Expires in 1 hour
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Detailed setup, adapters, and basic operations
- **[API Reference](./api.md)**: Comprehensive documentation of all methods and types
- **[Examples](./examples.md)**: Practical patterns for querying, transactions, and migrations

## ❓ FAQ

### Is Deposit production-ready?

Yes! Deposit is battle-tested and used in production applications. It has comprehensive test coverage and follows semantic versioning.

### Does Deposit work with React/Vue/Angular?

Absolutely! Deposit is framework-agnostic and works great with any JavaScript framework.

### Can I use Deposit in Node.js?

Deposit is designed for browser environments (IndexedDB, LocalStorage). For Node.js, consider using SQLite or other server-side databases.

### How do I handle schema changes?

Deposit supports migrations through version management. See the [Usage Guide](./usage.md#migrations) for details.

### What's the performance impact?

Deposit adds minimal overhead (~1-2ms) over native IndexedDB. The QueryBuilder is optimized for common operations.

### Can I use multiple databases?

Yes! Create multiple Deposit instances with different adapters and database names.

## 🐛 Troubleshooting

### QuotaExceededError

::: danger Problem
Storage quota exceeded.
:::

::: tip Solution
Check available storage and clean up old data:

```ts
// Check available storage
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const { usage, quota } = await navigator.storage.estimate();
  console.log(`Using ${usage} of ${quota} bytes`);
}

// Clean up old data
const oldTodos = await db
  .query('todos')
  .filter((todo) => todo.createdAt < Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toArray();

await db.bulkDelete(
  'todos',
  oldTodos.map((t) => t.id),
);
```

:::

### TypeScript errors with schema

::: danger Problem
Type inference not working.
:::

::: tip Solution
Ensure you're using type assertions in schema:

```ts
const schema = {
  users: {
    record: {} as User, // ✅ Correct
    // record: User     // ❌ Wrong
  },
};
```

:::

### Migration not running

::: danger Problem
Schema changes not applied.
:::

::: tip Solution
Increment the version number:

```ts
// Old
const adapter = new IndexedDBAdapter('my-db', 1, schema);

// New
const adapter = new IndexedDBAdapter('my-db', 2, schema);
```

:::

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/deposit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/deposit/CHANGELOG.md)

---

> **Tip:** Deposit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for logging, HTTP clients, permissions, and more.
