# <img src='/logo-depot.svg' alt='Deposit Logo' width='156' style='float: left; padding: 1rem; margin: 1rem;'/> Deposit

**Deposit** is a powerful, type-safe browser storage utility for modern web apps. It provides a unified API for IndexedDB and LocalStorage, advanced querying, transactions, and more—all with full TypeScript support.

## 🚀 Features

- **Unified API** for IndexedDB and LocalStorage
- **Type-safe schemas** and queries
- **Advanced QueryBuilder** (filter, sort, group, paginate, fuzzy search)
- **Bulk operations** and batch patching
- **Transactions** across tables
- **TTL (expiry) support** for records
- **Custom migrations** for IndexedDB
- **Zero dependencies** (except for optional logger/utils)

## 🏁 Getting Started

```ts
import { Deposit, LocalStorageAdapter } from '@vielzeug/deposit';

const schema = {
  users: { key: 'id', indexes: ['email'], record: {} as { id: string; name: string; email: string } },
};

const depot = new Deposit(new LocalStorageAdapter('mydb', 1, schema));
await depot.put('users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
const user = await depot.get('users', 'u1');
```

## 📚 Documentation

- [API Reference](./api.md): Full API details for all classes, types, and functions.
- [Usage](./usage.md): How to install, set up, and use Deposit in your project.
- [Examples](./examples.md): Practical code samples for all major features.

## 💡 Why Deposit?

- No more boilerplate for browser storage.
- Write queries like you would with an ORM.
- Migrate, patch, and transact with ease.
- Works in any modern browser, with or without IndexedDB.

---

> **Tip:** Deposit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) toolkit for modern web development.
