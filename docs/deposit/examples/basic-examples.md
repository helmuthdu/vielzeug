---
title: Deposit Examples — Basic
description: Core usage examples for localStorage and IndexedDB adapters.
---

## LocalStorage

```ts
import { createLocalStorage, type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema: Schema<{ users: User }> = { users: { key: 'id' } };

const db = createLocalStorage({ dbName: 'demo', schema });
await db.put('users', { id: 1, name: 'Alice' });
console.log(await db.getAll('users'));
```

## LocalStorage with TTL

```ts
import { createLocalStorage, ttl, type Schema } from '@vielzeug/deposit';

type Session = { id: string; userId: number };
const schema: Schema<{ sessions: Session }> = { sessions: { key: 'id' } };

const db = createLocalStorage({ dbName: 'demo-ttl', schema });
await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
```

## IndexedDB

```ts
import { createIndexedDB, type Schema } from '@vielzeug/deposit';

type Product = { id: number; name: string; price: number };
const schema: Schema<{ products: Product }> = { products: { key: 'id' } };

const db = createIndexedDB({ dbName: 'catalog', version: 1, schema });
await db.put('products', { id: 1, name: 'Keyboard', price: 99 });
const pricey = await db.from('products').between('price', 50, 200).toArray();
console.log(pricey);
```

## Query Composition

```ts
const page = await db
  .from('products')
  .startsWith('name', 'k', { ignoreCase: true })
  .orderBy('price', 'asc')
  .limit(10)
  .offset(0)
  .toArray();

const total = await db.from('products').count();
```
