# Depot Examples

Here are some practical examples of using the depot package.

## 1. Define a Schema

```ts
import { DepositDataSchema } from '@vielzeug/deposit';

type User = { id: string; name: string; age: number; email: string };
type Post = { id: number; title: string; content: string; authorId: string };

const schema = {
  users: { key: 'id', indexes: ['email'], record: {} as User },
  posts: { key: 'id', indexes: ['authorId'], record: {} as Post },
} satisfies DepositDataSchema;
```

## 2. Create a Depot Instance

### LocalStorage Adapter

```ts
import { Depot, LocalStorageAdapter } from '@vielzeug/deposit';

const localAdapter = new LocalStorageAdapter('mydb', 1, schema);
const localDepot = new Depot(localAdapter);
```

### IndexedDB Adapter

```ts
import { Depot, IndexedDBAdapter } from '@vielzeug/deposit';

const indexedAdapter = new IndexedDBAdapter('mydb', 1, schema);
const indexedDepot = new Depot(indexedAdapter);
```

## 3. Basic CRUD Operations

```ts
// Add a user
await localDepot.put('users', { id: 'u1', name: 'Alice', age: 30, email: 'alice@example.com' });

// Get a user
const user = await localDepot.get('users', 'u1');

// Update a user (just call put again)
await localDepot.put('users', { id: 'u1', name: 'Alice Smith', age: 31, email: 'alice@example.com' });

// Delete a user
await localDepot.delete('users', 'u1');

// Get all users
const allUsers = await localDepot.getAll('users');

// Count users
const userCount = await localDepot.count('users');

// Clear all users
await localDepot.clear('users');
```

## 4. Bulk Operations

```ts
// Bulk put
await localDepot.bulkPut('users', [
  { id: 'u2', name: 'Bob', age: 25, email: 'bob@example.com' },
  { id: 'u3', name: 'Carol', age: 28, email: 'carol@example.com' },
]);

// Bulk delete
await localDepot.bulkDelete('users', ['u2', 'u3']);
```

## 5. Patch Operations

```ts
await localDepot.patch('users', [
  { type: 'put', value: { id: 'u4', name: 'Dave', age: 40, email: 'dave@example.com' } },
  { type: 'delete', key: 'u4' },
  { type: 'clear' },
]);
```

## 6. Transactions

```ts
await localDepot.transaction(['users', 'posts'], async (stores) => {
  stores.users.push({ id: 'u5', name: 'Eve', age: 22, email: 'eve@example.com' });
  stores.posts.push({ id: 1, title: 'Hello', content: 'World', authorId: 'u5' });
});
```

## 7. Using TTL (Expiry)

```ts
// This user will expire in 1 hour (3600000 ms)
await localDepot.put('users', { id: 'u6', name: 'Frank', age: 35, email: 'frank@example.com' }, 3600000);
```

## 8. QueryBuilder Usage

```ts
// Find all users older than 25, ordered by age descending, limit 2
const results = await localDepot
  .query('users')
  .where('age', (age) => age > 25)
  .orderBy('age', 'desc')
  .limit(2)
  .toArray();

// Find users whose name starts with 'A'
const aUsers = await localDepot.query('users').startsWith('name', 'A').toArray();

// Get the first user
const firstUser = await localDepot.query('users').first();

// Get the number of users named 'Bob'
const bobCount = await localDepot.query('users').equals('name', 'Bob').count();
```

## 9. Error Handling

```ts
try {
  await localDepot.get('users', 'nonexistent');
} catch (err) {
  console.error('Failed to get user:', err);
}
```

## 10. Using with IndexedDB

All the above examples work the same way with the IndexedDB adapter:

```ts
await indexedDepot.put('users', { id: 'u7', name: 'Grace', age: 29, email: 'grace@example.com' });
const grace = await indexedDepot.get('users', 'u7');
```

For more advanced usage, see the API Reference and Usage docs.
