---
title: Deposit — Typed storage for TypeScript
description: Schema-driven storage abstraction with a rich query builder, LocalStorage and IndexedDB adapters, and zero dependencies.
---

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit Logo" width="156" class="logo-highlight"/>

# Deposit

**Deposit** is a schema-driven storage library with a rich query builder, `LocalStorageAdapter` and `IndexedDBAdapter`, and full TypeScript inference.

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
import { createDeposit, defineSchema } from '@vielzeug/deposit';

type User = { id: string; name: string; age: number };

const schema = defineSchema<{ users: User }>({
  users: { key: 'id', indexes: ['age'] },
});

const db = createDeposit({ type: 'localStorage', dbName: 'my-app', schema });

// Upsert records
await db.put('users', { id: '1', name: 'Alice', age: 30 });
await db.put('users', { id: '2', name: 'Bob', age: 25 });

// Query
const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();

// Fast lookup
const alice = await db.get('users', '1');
```

## Features

- **Schema-driven** — `defineSchema()` types every table and query result
- **Discriminated config** — `{ type: 'localStorage' | 'indexedDB', ... }` — no separate adapter setup
- **Rich query builder** — `equals`, `between`, `startsWith`, `filter`, `orderBy`, `limit`, `offset`, `page`, `reverse`, `map`, `search`
- **TTL support** — per-record expiry via optional `ttl` milliseconds on `put` / `bulkPut`
- **Transactions** — atomic multi-table writes (IndexedDB only)
- **Zero dependencies** — <PackageInfo package="deposit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Schema definition, adapters, query builder, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world storage patterns and framework integrations |
