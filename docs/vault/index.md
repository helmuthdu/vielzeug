---
title: Vault — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: vault
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session, reactive, signals]
related: [courier, rune, ripple, spell, arsenal]
exports:
  [
    createLocalStorage,
    createSessionStorage,
    createIndexedDB,
    createMemory,
    table,
    ttl,
    defaultCodec,
    scheduleExpiredPrune,
    defineMigration,
    VaultError,
    VaultDisposedError,
    VaultMigrationError,
    VaultQuotaError,
    VaultScopeError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="vault" />

## Why Vault?

Native browser storage APIs require manual serialisation, no types, and separate APIs per backend.

```ts
// Before — raw localStorage with no typing
const raw = localStorage.getItem('app:users:1');
const user = raw ? JSON.parse(raw) : null; // unknown type, no TTL, no queries

// After — Vault typed adapter
import { createLocalStorage, table } from '@vielzeug/vault';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const db = createLocalStorage({ name: 'app', schema });

const user = await db.get('users', 1); // User | undefined — fully typed
await db.put('users', { id: 2, name: 'Bob', age: 25 }, ttl.hours(1)); // TTL built in
const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();
```

| Feature                 | Vault                                       | Dexie.js | idb-keyval | Raw Web Storage   |
| ----------------------- | ------------------------------------------- | -------- | ---------- | ----------------- |
| Bundle size             | <PackageInfo package="vault" type="size" /> | ~26 kB   | ~1.3 kB    | Native            |
| TypeScript schema types | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>        | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="x" size="16"></sg-icon>                |
| Query builder           | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>        | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="x" size="16"></sg-icon>                |
| TTL                     | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="x" size="16"></sg-icon>        | <sg-icon name="x" size="16"></sg-icon>         | Manual            |
| Multiple backends       | <sg-icon name="check" size="16"></sg-icon>                                          | IDB only | IDB only   | localStorage only |
| Reactivity              | <sg-icon name="check" size="16"></sg-icon>                                          | `liveQuery` | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="x" size="16"></sg-icon>                |
| Zero dependencies       | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>        | <sg-icon name="check" size="16"></sg-icon>         | Native            |

<div class="decision-callout">

**Use Vault when** you need typed, queryable browser storage with TTL and reactivity across LocalStorage, SessionStorage, IndexedDB, and Memory from a single consistent API.

**Consider alternatives when** you need a mature IDB-first solution with a large ecosystem — use Dexie.js. For the smallest possible IDB wrapper without abstractions, use `idb-keyval`. For raw performance without any library, use the Web Storage and IndexedDB APIs directly.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/vault
```

```sh [npm]
npm install @vielzeug/vault
```

```sh [yarn]
yarn add @vielzeug/vault
```

:::

## Quick Start

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/vault';

type User = { id: number; name: string; age: number };

const schema = {
  users: table<User>('id'),
};

const db = createIndexedDB({ name: 'app', schema, version: 1 });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
await db.put('users', { id: 2, name: 'Bob', age: 25 }, ttl.hours(1));

const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();

void adults;
```

## Features

<div class="features-grid">

- **`table<T>(key)`** — typed schema entry; infers record type and primary-key field; chain `.ttl(ms)` for a per-table default TTL
- **`createLocalStorage`** / **`createSessionStorage`** / **`createIndexedDB`** / **`createMemory`** — four adapters sharing one `Adapter<S>` interface; swap backends without touching application code
- **`put`** / **`putAll`** — write one or many records; TTL enforced via the branded `TtlMs` type
- **`get`** / **`getAll`** / **`getMany`** — point lookups and bulk fetch; preserves key order, missing keys yield `undefined`
- **`update(table, key, changes)`** — shallow-merge partial fields; **`upsert`** for read-modify-write; **`getOrDefault`** for read-or-insert
- **`delete`** / **`deleteMany`** / **`clear`** — single, bulk, or full-table deletion
- **`query(table)`** — lazy `QueryBuilder` with `.filter()`, `.equals()`, `.between()`, `.startsWith()`, `.orderBy()`, `.limit()`, `.offset()`; terminal `.toArray()` / `.first()` / `.delete()`
- **`observe(table, fn)`** — subscribe to table changes; fires immediately with current snapshot then on every mutation; returns unsubscribe function
- **`observeMany(tables, fn)`** — combined snapshot across multiple tables; coalesces batch writes into one callback
- **`watch(table)`** — `AsyncIterable` of fresh snapshots; `mode: 'latest'` drops intermediates; `signal` stops from outside
- **`batch(tables, tx => ...)`** — deferred observer notifications on all adapters; atomic IDB transaction on IndexedDB
- **`ttl.ms / .seconds / .minutes / .hours / .days`** — branded duration helpers; raw numbers are rejected by the type system
- **`pruneExpired`** / **`scheduleExpiredPrune`** — sweep expired records manually or on an interval
- **`iterate(table)`** — cursor-based `AsyncIterable` over all live records without loading the full table into memory
- Ripple signals plugin, Rune logger plugin, and Spell validators plugin — pass any compatible object; structural, not coupled

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — sync persisted values into signals for reactive UI updates whenever storage changes
- [Courier](/courier/) — HTTP client; hydrate Courier's cache from Vault on startup to avoid redundant network requests
- [Rune](/rune/) — structured logger; audit storage reads and writes with a Rune transport
- [Spell](/spell/) — schema validation; pass a Spell schema to Vault to type-gate values before they are persisted

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
