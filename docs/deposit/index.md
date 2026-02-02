# <img src="/logo-depot.svg" alt="Deposit" width="32" style="display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 10px;"> Deposit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-28.2_KB-success" alt="Size">
</div>

**Deposit** is a powerful, type-safe browser storage utility for modern web apps. It provides a unified, developer-friendly API for **IndexedDB** and **LocalStorage**, featuring advanced querying, migrations, and transactions.

## 🚀 Key Features

- **Unified API**: Switch between LocalStorage and IndexedDB without changing your code.
- **Type-safe**: Define your schemas once and enjoy full autocompletion and type checking.
- **Advanced Querying**: A rich QueryBuilder supporting filters, sorting, grouping, and pagination.
- **Migrations**: Robust support for schema versioning and data migrations in IndexedDB.
- **Transactions**: Ensure data integrity with atomic operations across multiple tables.
- **TTL (Time-To-Live)**: Native support for record expiration.
- **Isomorphic**: Minimal footprint with optional logging and utility integration.

## 🏁 Quick Start

```sh
pnpm add @vielzeug/deposit
```

### Basic Setup

```ts
import { Deposit, IndexedDBAdapter } from '@vielzeug/deposit';

// 1. Define your schema
const schema = {
  users: { 
    key: 'id', 
    indexes: ['email'], 
    record: {} as { id: string; name: string; email: string } 
  },
};

// 2. Initialize the depot
const adapter = new IndexedDBAdapter('my-app-db', 1, schema);
const db = new Deposit(adapter);

// 3. Start storing data
await db.put('users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
const user = await db.get('users', 'u1');
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Detailed setup, adapters, and basic operations.
- **[API Reference](./api.md)**: Comprehensive documentation of all methods and types.
- **[Examples](./examples.md)**: Practical patterns for querying, transactions, and migrations.

## 💡 Why Deposit?

Native browser storage APIs (like IndexedDB) are notoriously complex and verbose. Deposit abstracts this complexity away, providing an ORM-like experience that makes client-side data management a breeze.

---

> **Tip:** Deposit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

