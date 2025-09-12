# Deposit Usage

How to install, import, and use the deposit package in your project.

## Installation

```sh
pnpm add @vielzeug/deposit
```

## Import

```ts
import { Depot, LocalStorageAdapter, IndexedDBAdapter } from '@vielzeug/deposit';
```

## Define a Schema

```ts
type User = { id: string; name: string; age: number; email: string };
const schema = {
  users: { key: 'id', indexes: ['email'], record: {} as User },
};
```

## Create a Depot Instance

### Using LocalStorage

```ts
const localAdapter = new LocalStorageAdapter('mydb', 1, schema);
const deposit = new Depot(localAdapter);
```

### Using IndexedDB

```ts
const indexedAdapter = new IndexedDBAdapter('mydb', 1, schema);
const deposit = new Depot(indexedAdapter);
```

## Basic Usage

```ts
// Add a user
await deposit.put('users', { id: 'u1', name: 'Alice', age: 30, email: 'alice@example.com' });

// Get a user
const user = await deposit.get('users', 'u1');

// Update a user
await deposit.put('users', { id: 'u1', name: 'Alice Smith', age: 31, email: 'alice@example.com' });

// Delete a user
await deposit.delete('users', 'u1');

// Get all users
const allUsers = await deposit.getAll('users');
```

## Advanced Features

- Bulk operations: `bulkPut`, `bulkDelete`
- Patch operations: `patch`
- Transactions: `transaction`
- TTL (expiry): pass a TTL in ms to `put`/`bulkPut`
- QueryBuilder: advanced queries with `query('users').where(...).orderBy(...).toArray()`

See the [API Reference](./api.md) and [Examples](./examples.md) for more details.
