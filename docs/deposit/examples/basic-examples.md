---
title: Deposit Examples — Basic
description: Core usage examples for localStorage, sessionStorage, cookie, IndexedDB, and memory adapters.
---

## Define a Schema with table()

```ts
import { table } from '@vielzeug/deposit';

type User = { id: number; name: string };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};
```

No `Schema<{...}>` annotation needed. `typeof schema` carries full type information.

## LocalStorage

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createLocalStorage({ dbName: 'demo', schema });
await db.put('users', { id: 1, name: 'Alice' });
console.log(await db.getAll('users'));
```

## LocalStorage with TTL

```ts
import { createLocalStorage, table, ttl } from '@vielzeug/deposit';

type Session = { id: string; userId: number };
const schema = { sessions: table<Session>('id') };

const db = createLocalStorage({ dbName: 'demo-ttl', schema });
await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
```

## SessionStorage

```ts
import { createSessionStorage, table } from '@vielzeug/deposit';

type Draft = { id: string; body: string };
const schema = { drafts: table<Draft>('id') };

const db = createSessionStorage({ dbName: 'editor', schema });
await db.put('drafts', { id: 'd1', body: 'hello' });
console.log(await db.get('drafts', 'd1'));
```

## Cookie Adapter

```ts
import { createCookie, table } from '@vielzeug/deposit';

type Pref = { id: string; value: string };
const schema = { prefs: table<Pref>('id') };

const db = createCookie({
  dbName: 'prefs',
  path: '/',
  sameSite: 'Strict',
  schema,
  secure: true,
});

await db.put('prefs', { id: 'locale', value: 'en-US' });
console.log(await db.get('prefs', 'locale'));
```

## IndexedDB

```ts
import { createIndexedDB, table } from '@vielzeug/deposit';

type Product = { id: number; name: string; price: number };
const schema = { products: table<Product>('id') };

const db = createIndexedDB({ dbName: 'catalog', version: 1, schema });
await db.put('products', { id: 1, name: 'Keyboard', price: 99 });
const pricey = await db.from('products').between('price', 50, 200).toArray();
console.log(pricey);
```

## Memory Adapter

```ts
import { createMemory, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({ schema });
await db.put('users', { id: 1, name: 'Alice' });
console.log(await db.getAll('users'));
```

No browser APIs required — ideal for tests and server environments.

## Existence Check and Bulk Write

```ts
await db.putAll('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);

console.log(await db.has('users', 1));  // true
console.log(await db.has('users', 99)); // false
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

// Get the single cheapest matching product
const cheapest = await db
  .from('products')
  .startsWith('name', 'k', { ignoreCase: true })
  .orderBy('price', 'asc')
  .first();
```
