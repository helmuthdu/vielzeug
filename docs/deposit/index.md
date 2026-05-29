---
title: Deposit — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session, reactive, signals]
related: [courier, rune, ripple, sieve, toolkit]
exports: [createLocalStorage, createSessionStorage, createIndexedDB, createMemory, table, ttl, scheduleExpiredPrune, DepositError, DepositDisposedError, DepositMigrationError, DepositQuotaError, DepositScopeError, IndexedDbAdapter, BaseAdapterOptions]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit logo" width="156" class="logo-highlight"/>

# Deposit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`, `scheduleExpiredPrune`

**When to use:** Structured, queryable browser storage with TTL, reactivity, and TypeScript types.

**Related:** [Courier](/courier/) · [Rune](/rune/) · [Ripple](/ripple/) · [Sieve](/sieve/) · [Toolkit](/toolkit/)

</details>

`@vielzeug/deposit` is a compact, typed storage layer with four adapters:

- `createLocalStorage({ name, schema })` — lightweight browser persistence
- `createSessionStorage({ name, schema })` — tab-scoped persistence
- `createIndexedDB({ name, schema, version })` — transactional, atomic storage
- `createMemory({ schema })` — in-process store for tests and SSR

All four adapters share the same `Adapter<S>` interface, so you can swap backends without touching application code.

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
import { createIndexedDB, table, ttl } from '@vielzeug/deposit';

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

## Why Deposit?

Native browser storage APIs require manual serialisation, no types, and separate APIs per backend.

```ts
// Before — raw localStorage with no typing
const raw = localStorage.getItem('app:users:1');
const user = raw ? JSON.parse(raw) : null; // unknown type, no TTL, no queries

// After — Deposit typed adapter
import { createLocalStorage, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const db = createLocalStorage({ name: 'app', schema });

const user = await db.get('users', 1); // User | undefined — fully typed
await db.put('users', { id: 2, name: 'Bob', age: 25 }, ttl.hours(1)); // TTL built in
const adults = await db.query('users').between('age', 18, 99).orderBy('name').toArray();
```

| Feature | Deposit | idb-keyval | Raw Web Storage |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="deposit" type="size" /> | ~1.3 kB | Native |
| TypeScript schema types | ✅ | ❌ | ❌ |
| Query builder | ✅ | ❌ | ❌ |
| TTL | ✅ | ❌ | Manual |
| Multiple backends | ✅ | IDB only | localStorage only |
| Reactivity | ✅ | ❌ | ❌ |
| Zero dependencies | ✅ | ✅ | Native |

**Use Deposit when** you need typed, queryable browser storage with TTL and reactivity across LocalStorage, SessionStorage, IndexedDB, and Memory from a single consistent API.

**Consider alternatives when** you need the smallest possible IDB wrapper without TypeScript — use `idb-keyval`. For raw performance without any abstraction, use the Web Storage and IndexedDB APIs directly.

## Features

### Schema and Adapters

- **`table<T>(key)`** — typed schema entry; infers record type and primary-key field; chain `.ttl(ms)` for a per-table default TTL
- **`createLocalStorage({ name, schema })`** — lightweight browser persistence using `localStorage`
- **`createSessionStorage({ name, schema })`** — tab-scoped persistence using `sessionStorage`
- **`createIndexedDB({ name, schema, version })`** — atomic, transactional storage using IndexedDB
- **`createMemory({ schema, name? })`** — in-process store; optional cross-tab sync via `BroadcastChannel`; ideal for tests and SSR

### Core Operations

- **`put(table, record, ttl?)`** / **`putAll(table, records, ttl?)`** — write one or many records; TTL enforced via the branded `TtlMs` type
- **`get(table, key)`** / **`getAll(table)`** / **`getMany(table, keys)`** — point lookups and bulk fetch; preserves key order, missing keys yield `undefined`
- **`has(table, key)`** / **`count(table)`** — existence check and live-record count
- **`update(table, key, changes)`** — shallow-merge partial fields; returns merged record or `undefined`
- **`upsert(table, key, fn)`** — read-modify-write; callback receives current record (or `undefined`)
- **`delete(table, key)`** / **`deleteMany(table, keys)`** / **`clear(table)`** — single, bulk, or full-table deletion

### Query Builder

- **`query(table)`** — returns a lazy `QueryBuilder`; apply `.filter()`, `.equals()`, `.between()`, `.startsWith()`, `.orderBy()`, `.limit()`, `.offset()`
- **`count()`** — records in the current page (respects `limit`/`offset`)
- **`totalCount()`** — full filtered-set size, ignoring `limit`, `offset`, and `orderBy`; use for "page X of N" UIs
- **`toArray()`** / **`first()`** / **`delete()`** — terminal methods

### Reactivity

- **`observe(table, fn, { immediate? })`** — subscribe to table changes; returns an unsubscribe function
- **`observeMany(tables, fn, { immediate? })`** — combined snapshot across multiple tables; coalesces batch writes into one callback
- **`watch(table)`** — `AsyncIterable` that yields a fresh snapshot on every change, starting immediately; auto-cleans up on loop exit

### Batch and Transactions

- **`batch(tables, tx => ...)`** — deferred observer notifications on all adapters; atomic IDB transaction on IndexedDB
- **`getOrDefault(table, key, defaultFn)`** — read-or-insert inside `batch()` only; atomic on IndexedDB

### TTL and Pruning

- **`ttl.ms / .seconds / .minutes / .hours / .days`** — branded duration helpers; raw numbers are rejected by the type system
- **`pruneExpired()`** — sweep all tables, delete expired records, return count per table
- **`scheduleExpiredPrune(db, { interval })`** — periodic pruning; returns a `stop` function

### Iteration

- **`iterate(table)`** — cursor-based `AsyncIterable` over all live records; IndexedDB only; never loads full table into memory

### Plugins (structural interfaces — pass any compatible object)

- **`signals`** — `TableSignals<S>`: wire `@vielzeug/ripple` signals; auto-updated on every table change
- **`logger`** — `DepositLogger`: route observer errors to `@vielzeug/rune` or any `{ error }` object
- **`validators`** — `TableValidators<S>`: validate on every write with `@vielzeug/sieve` or any `{ parse }` object
- **`onMetrics`** — called after every operation with table name, operation name, and duration in ms
- **`onQuotaExceeded`** — `(table, err) => 'ignore' | 'throw'`; LocalStorage / SessionStorage only

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅ |
| Node.js     | ⚠️ (`createMemory` works; browser adapters require web APIs) |
| SSR         | ⚠️ (`createMemory` works directly; browser adapters require polyfills) |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/)
- [Courier](/courier/)
- [Rune](/rune/)
- [Sieve](/sieve/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
