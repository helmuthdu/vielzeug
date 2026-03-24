---
title: Deposit — Schema-driven browser storage for TypeScript
description: Persist typed records to IndexedDB or LocalStorage with a fluent query builder, TTL, batch operations, and atomic transactions. Zero dependencies.
---

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit logo" width="156" class="logo-highlight"/>

# Deposit

**Deposit** is a schema-driven storage library for the browser. Define typed tables, persist records to IndexedDB (structured browser database) or LocalStorage (key-value storage), and query results with a fluent builder without writing raw database calls.

<!-- Search keywords: browser storage layer, indexeddb wrapper, local storage schema. -->

## Installation

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

## Quick Start

```ts
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';

interface User {
  id: number;
  name: string;
  age: number;
}

const schema = defineSchema<{ users: User }>({ users: { key: 'id' } });
const db = createLocalStorage({ dbName: 'my-app', schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 });

const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
const alice = await db.get('users', 1);
const patched = await db.patch('users', 1, { age: 31 }); // returns merged User

for await (const user of db.from('users').orderBy('name')) {
  console.log(user.name);
}
```

## Why Deposit?

Raw IndexedDB requires verbose event-based boilerplate; `localStorage` loses type information and offers no query capabilities.

```ts
// Before — raw IndexedDB boilerplate
const req = indexedDB.open('my-app', 1);
req.onupgradeneeded = (e) => {
  (e.target as IDBOpenDBRequest).result.createObjectStore('users', { keyPath: 'id' });
};
req.onsuccess = (e) => {
  const db = (e.target as IDBOpenDBRequest).result;
  const all = db.transaction('users', 'readonly').objectStore('users').getAll();
  all.onsuccess = () => {
    /* untyped, no filtering */
  };
};

// After — Deposit
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';
const schema = defineSchema<{ users: User }>({ users: { key: 'id', indexes: ['age'] } });
const db = createLocalStorage({ dbName: 'my-app', schema });
await db.put('users', { id: 1, name: 'Alice', age: 30 });
const adults = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
```

| Feature              | Deposit                                       | Dexie.js  | idb     |
| -------------------- | --------------------------------------------- | --------- | ------- |
| Bundle size          | <PackageInfo package="deposit" type="size" /> | ~32 kB    | ~1.5 kB |
| LocalStorage adapter | ✅ Built-in                                   | ❌        | ❌      |
| Query builder        | ✅ Fluent                                     | ✅        | ❌      |
| TTL support          | ✅ Built-in                                   | ❌        | ❌      |
| Typed schema         | ✅                                            | ⚠️ Manual | ❌      |
| Transactions         | ✅ (IndexedDB)                                | ✅        | ✅      |
| Zero dependencies    | ✅                                            | ✅        | ✅      |

**Use Deposit when** you want typed, queryable browser storage across both `localStorage` and IndexedDB through one consistent API.

**Consider Dexie.js** if you need live queries, Dexie Cloud sync, or advanced IndexedDB hooks beyond what Deposit offers.

## Features

- **Two adapters** — `createLocalStorage()` and `createIndexedDB()` share an identical `Adapter` interface
- **Schema-driven** — `defineSchema()` types every table, key, and query result; or pass inline with a type parameter
- **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `and`, `or`, `search`, `contains`, `orderBy`, `limit`, `offset`, `page`, `map`, `reduce`, and more
- **`for await...of`** — `QueryBuilder` implements `AsyncIterator` for streamed processing
- **TTL** — per-record expiry via optional `ttl` on `put`, `putMany`, and `getOrPut`; use the `ttl` helper (`.days()`, `.hours()`, `.minutes()`, `.seconds()`, `.ms()`) for readable durations
- **Adapter-specific count semantics** — localStorage returns TTL-accurate counts; IndexedDB returns native O(1) counts (expired records may still be included until eviction)
- **`patch` returns merged record** — no follow-up `get` needed after a partial update
- **`getOr`** — typed non-nullable get with a fallback default value
- **`getMany`** — batch fetch by a list of keys in a single operation
- **Transactions** — atomic multi-table writes with the full read/write method set (IndexedDB only)
- **Bulk operations** — `putMany` and `deleteMany` for operating on multiple records at once
- **`storeField()`** — migration helper that encapsulates deposit's internal key-path convention
- **Utility types** — `RecordOf<S, K>` and `KeyOf<S, K>` for typed schema access
- **Lightweight** — <PackageInfo package="deposit" type="size" /> gzipped, zero external dependencies

## Compatibility

| Environment | Support                     |
| ----------- | --------------------------- |
| Browser     | ✅ (IndexedDB/LocalStorage) |
| Node.js     | ❌ (Web APIs only)          |
| SSR         | ❌                          |
| Deno        | ❌                          |

## Prerequisites

- Browser environment with `indexedDB` and/or `localStorage` available.
- Storage permission must be enabled in the runtime context (for example, not blocked by privacy mode).
- Define a schema up front so query/index operations stay typed.

## See Also

- [Fetchit](/fetchit/)
- [Validit](/validit/)
- [Stateit](/stateit/)
