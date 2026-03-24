---
title: 'Deposit Examples — Basic Examples'
description: 'Basic LocalStorage and IndexedDB examples for Deposit.'
---

## Basic Examples

## Problem

Implement basic examples in a production-friendly way with `@vielzeug/deposit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/deposit` installed.

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
const byPrefix = await db.from('products').startsWith('name', 'mo', { ignoreCase: true }).toArray();

// Async iteration over all products
for await (const product of db.from('products').orderBy('name')) {
  console.log(`${product.name} — €${product.price}`);
}

db.close();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Advanced Examples](./advanced-examples.md)
