---
title: Deposit — Schema-driven browser storage for TypeScript
description: Persist typed records to IndexedDB or LocalStorage with a fluent query builder, TTL, batch operations, and atomic transactions. Zero dependencies.
---

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit Logo" width="156" class="logo-highlight"/>

# Deposit

**Deposit** is a schema-driven storage library for the browser: define typed tables, persist records to IndexedDB or LocalStorage via dedicated factory functions, and query results with a fluent builder — without writing a single raw database call.

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

interface User { id: number; name: string; age: number }

const schema = defineSchema<{ users: User }>({ users: { key: 'id' } });
const db = createLocalStorage({ dbName: 'my-app', schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 });

const adults  = await db.from('users').between('age', 18, 99).orderBy('name').toArray();
const alice   = await db.get('users', 1);
const patched = await db.patch('users', 1, { age: 31 }); // returns merged User

for await (const user of db.from('users').orderBy('name')) {
  console.log(user.name);
}
```

## Features

- **Two adapters** — `createLocalStorage()` and `createIndexedDB()` share an identical `Adapter` interface
- **Schema-driven** — `defineSchema()` types every table, key, and query result; or pass inline with a type parameter
- **Fluent query builder** — `equals`, `between`, `startsWith`, `filter`, `and`, `or`, `search`, `contains`, `orderBy`, `limit`, `offset`, `page`, `map`, and more
- **`for await...of`** — `QueryBuilder` implements `AsyncIterator` for streamed processing
- **TTL** — per-record expiry via optional `ttl` (milliseconds) on `put` and `getOrPut`; expired entries evicted on read
- **`patch` returns merged record** — no follow-up `get` needed after a partial update
- **`getMany`** — batch fetch by a list of keys in a single operation
- **Transactions** — atomic multi-table writes with `get`, `getAll`, `put`, `patch`, and `delete` (IndexedDB only)
- **Bulk operations** — `put` and `delete` accept a single value or an array
- **`storeField()`** — migration helper that encapsulates deposit's internal key-path convention
- **Lightweight** — <PackageInfo package="deposit" type="size" /> gzipped, zero external dependencies

## Next Steps

| | |
| --- | --- |
| [Usage Guide](./usage.md) | Schema, CRUD, queries, TTL, transactions, and migrations |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world storage patterns |
