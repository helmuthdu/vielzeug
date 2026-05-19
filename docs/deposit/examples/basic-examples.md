---
title: Deposit Examples — Basic
description: Core usage examples for localStorage, sessionStorage, IndexedDB, and memory adapters.
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

No `Schema<{...}>` wrapper needed — `typeof schema` carries full type information.

## LocalStorage

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createLocalStorage({ name: 'demo', schema });
await db.put('users', { id: 1, name: 'Alice' });
console.log(await db.getAll('users'));
```

## SessionStorage

```ts
import { createSessionStorage, table } from '@vielzeug/deposit';

type Draft = { id: string; body: string };
const schema = { drafts: table<Draft>('id') };

const db = createSessionStorage({ name: 'editor', schema });
await db.put('drafts', { id: 'd1', body: 'hello' });
console.log(await db.get('drafts', 'd1'));
```

## IndexedDB

```ts
import { createIndexedDB, table } from '@vielzeug/deposit';

type Product = { id: number; name: string; price: number };
const schema = { products: table<Product>('id') };

const db = createIndexedDB({ name: 'catalog', schema, version: 1 });
await db.put('products', { id: 1, name: 'Keyboard', price: 99 });
const pricey = await db.query('products').between('price', 50, 200).toArray();
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

## Use TTL

Always use the `ttl` helpers — raw numbers are rejected by the type system.

```ts
import { createLocalStorage, table, ttl } from '@vielzeug/deposit';

type Session = { id: string; userId: number };
const schema = { sessions: table<Session>('id') };

const db = createLocalStorage({ name: 'demo-ttl', schema });

await db.put('sessions', { id: 's1', userId: 1 }, ttl.minutes(30));
await db.put('sessions', { id: 's2', userId: 2 }, ttl.hours(8));
```

Per-table default TTL via `.ttl()`:

```ts
const schema = {
  sessions: table<Session>('id').ttl(ttl.hours(1)),
};
```

## Existence Check and Bulk Write

```ts
await db.putAll('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);

console.log(await db.has('users', 1));  // true
console.log(await db.has('users', 99)); // false
console.log(await db.count('users'));   // 2
```

## Update and Delete

```ts
// merge fields — returns updated record or undefined if not found
const updated = await db.update('users', 1, { name: 'Alicia' });

// delete single record — returns true if it existed
const deleted = await db.delete('users', 1);

// delete all records in a table
await db.deleteAll('users');

void updated, deleted;
```

## Query Composition

```ts
const page = await db
  .query('products')
  .startsWith('name', 'k', { ignoreCase: true })
  .orderBy('price', 'asc')
  .limit(10)
  .offset(0)
  .toArray();

const total = await db.query('products').count();

const cheapest = await db
  .query('products')
  .startsWith('name', 'k', { ignoreCase: true })
  .orderBy('price', 'asc')
  .first();

void page, total, cheapest;
```

## Reactive Reads

```ts
const stop = db.observe('users', (rows) => {
  console.log('users:', rows.length);
});

// opt out of the initial snapshot
const stopSilent = db.observe('users', handleChange, { initialEmit: false });

await db.put('users', { id: 1, name: 'Alice' }); // triggers both

stop();
stopSilent();
```
