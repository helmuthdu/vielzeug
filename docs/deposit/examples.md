---
title: Deposit — Examples
description: Real-world storage patterns using the Deposit browser storage library.
---

# Deposit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations and [API Reference](./api.md) for full type signatures.
:::

[[toc]]

## Basic Examples

### User Store (LocalStorage)

A simple typed store for user preferences persisted to `localStorage`.

```ts
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';

interface Preferences {
  id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const schema = defineSchema<{ preferences: Preferences }>({
  preferences: { key: 'id' },
});

const db = createLocalStorage({ dbName: 'my-app', schema });

// Save defaults on first load
await db.getOrPut('preferences', 'user-1', () => ({
  id: 'user-1',
  theme: 'light',
  language: 'en',
  notifications: true,
}));

// Read
const prefs = await db.get('preferences', 'user-1');

// Partial update — returns the merged record immediately
const updated = await db.patch('preferences', 'user-1', { theme: 'dark' });
console.log(updated?.theme); // 'dark'
```

---

### Product Catalogue (IndexedDB)

A full CRUD example using IndexedDB with schema indexes and query builder.

```ts
import { createIndexedDB, defineSchema } from '@vielzeug/deposit';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const schema = defineSchema<{ products: Product }>({
  products: { key: 'id', indexes: ['category', 'price'] },
});

const db = createIndexedDB({ dbName: 'catalogue', version: 1, schema });

// Seed data
await db.putMany('products', [
  { id: 1, name: 'Keyboard', category: 'peripherals', price: 79, inStock: true },
  { id: 2, name: 'Monitor', category: 'displays', price: 349, inStock: true },
  { id: 3, name: 'Webcam', category: 'peripherals', price: 59, inStock: false },
]);

// Query peripherals under €100, sorted by price
const affordable = await db
  .from('products')
  .equals('category', 'peripherals')
  .between('price', 0, 100)
  .orderBy('price', 'asc')
  .toArray();

// Full-text search
const results = await db.from('products').search('key').toArray();

// Async iteration over all products
for await (const product of db.from('products').orderBy('name')) {
  console.log(`${product.name} — €${product.price}`);
}

db.close();
```

## Advanced Examples

### Session Cache with TTL

Cache authentication data with automatic expiry. No manual expiry checks needed.

```ts
import { createLocalStorage, defineSchema, ttl } from '@vielzeug/deposit';

interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

const schema = defineSchema<{ sessions: Session }>({ sessions: { key: 'id' } });
const cache = createLocalStorage({ dbName: 'auth', schema });

async function getOrRefreshSession(id: string): Promise<Session> {
  return cache.getOrPut(
    'sessions',
    id,
    async () => {
      const res = await fetch('/api/auth/refresh');
      const data = (await res.json()) as Session;
      return data;
    },
    ttl.hours(1),
  );
}

// Invalidate on logout
async function logout(id: string) {
  await cache.delete('sessions', id);
}
```

---

### Multi-Table Atomic Transaction

An order is updated and a related audit log entry is created in a single atomic write.

```ts
import { createIndexedDB, defineSchema } from '@vielzeug/deposit';

interface Order {
  id: number;
  userId: number;
  status: 'pending' | 'shipped' | 'delivered';
  total: number;
}
interface AuditLog {
  id: number;
  orderId: number;
  action: string;
  at: number;
}

const schema = defineSchema<{ orders: Order; audit: AuditLog }>({
  orders: { key: 'id' },
  audit: { key: 'id', indexes: ['orderId'] },
});

const db = createIndexedDB({ dbName: 'shop', version: 1, schema });

async function shipOrder(orderId: number, auditId: number): Promise<void> {
  await db.transaction(['orders', 'audit'], async (tx) => {
    const order = await tx.get('orders', orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status !== 'pending') throw new Error('Order already processed');

    await tx.patch('orders', orderId, { status: 'shipped' });
    await tx.put('audit', { id: auditId, orderId, action: 'shipped', at: Date.now() });

    // reads also work inside the transaction
    const total = await tx.count('orders');
    const recent = await tx.from('audit').orderBy('at', 'desc').limit(5).toArray();
  });
  // Either both writes happened, or neither did
}
```

---

### Batch Operations

Import, delete, and query records in bulk.

```ts
import { createIndexedDB, defineSchema } from '@vielzeug/deposit';

interface Contact {
  id: number;
  name: string;
  email: string;
  group: string;
}

const schema = defineSchema<{ contacts: Contact }>({
  contacts: { key: 'id', indexes: ['group'] },
});

const db = createIndexedDB({ dbName: 'crm', version: 1, schema });

// Bulk import
const imported: Contact[] = await fetch('/api/contacts').then((r) => r.json());
await db.putMany('contacts', imported);

// Fetch specific records by ID
const selected = await db.getMany('contacts', [1, 7, 42]);

// Bulk delete stale records
const staleIds = (await db.from('contacts').equals('group', 'archived').toArray()).map((c) => c.id);
await db.deleteMany('contacts', staleIds);

// Numeric aggregation with reduce
const totalCount = await db.from('contacts').count();
const activeCount = await db
  .from('contacts')
  .filter((c) => c.group !== 'archived')
  .count();

// Find contacts by name substring
const smiths = await db.from('contacts').contains('smith', ['name']).toArray();

db.close();
```

---

### Schema Migration

Add an index and a table when upgrading from v1 to v3.

```ts
import { createIndexedDB, defineSchema, type MigrationFn, storeField } from '@vielzeug/deposit';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
interface Tag {
  id: number;
  label: string;
}

const schema = defineSchema<{ users: User; tags: Tag }>({
  users: { key: 'id', indexes: ['email', 'role'] },
  tags: { key: 'id' },
});

const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
  if (oldVersion < 2) {
    // Add role index introduced in v2
    tx.objectStore('users').createIndex('role', storeField('role'));
  }
  if (oldVersion < 3) {
    // New table introduced in v3
    db.createObjectStore('tags', { keyPath: storeField('id') });
  }
};

const db = createIndexedDB({ dbName: 'my-app', version: 3, schema, migrationFn });
```

---

### Inline Schema

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const db = createLocalStorage<{ items: { id: string; label: string; done: boolean } }>({
  dbName: 'todos',
  schema: { items: { key: 'id' } },
});

await db.put('items', { id: '1', label: 'Buy milk', done: false });
const todo = await db.get('items', '1');
// todo is typed as { id: string; label: string; done: boolean } | undefined
```
