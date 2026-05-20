---
title: Deposit — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session]
related: [fetchit, logit, toolkit]
exports: [createLocalStorage, createSessionStorage, createIndexedDB, createMemory, table, ttl]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit logo" width="156" class="logo-highlight"/>

# Deposit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`

**When to use:** Structured, queryable browser storage with TTL, reactivity, and TypeScript types.

**Related:** [Fetchit](/fetchit/) · [Logit](/logit/) · [Toolkit](/toolkit/)

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

Native browser storage APIs are powerful but inconsistent and repetitive to use directly.

- Typed table schemas via `table<T>(key)`
- One `Adapter<S>` interface across all four backends
- Chainable query builder for filtering, sorting, pagination, and predicate deletes
- TTL on any write — enforced via the branded `TtlMs` type; use `ttl.*` helpers
- Reactive reads via `observe(table, listener)`
- Deferred-notification `batch()` for multi-table writes; atomic IDB transactions for IndexedDB
- Optional validation, structured logging, and metrics hooks

## Features

| Feature | Details |
| --- | --- |
| **Typed schemas** | `table<T>(key)` infers record and primary-key types |
| **Adapter parity** | `LocalStorage`, `SessionStorage`, `IndexedDB`, `Memory` all implement `Adapter<S>` |
| **Queries** | `filter`, `equals`, `between`, `startsWith`, `orderBy`, `limit`, `offset` |
| **Terminal actions** | `toArray()`, `count()`, `first()`, `delete()` |
| **Lazy iteration** | `iterate(table)` yields records one at a time |
| **TTL** | `ttl.ms/seconds/minutes/hours/days` — branded, validated at write time |
| **Reactivity** | `observe(table, fn, { immediate? })` |
| **Batch** | `batch(tables, tx => ...)` — deferred notifications on all adapters; atomic on IDB |
| **Upsert** | `upsert(table, key, fn)` — read-modify-write in one call |
| **Debug** | `debug()` — live vs expired record counts per table |
| **Plugins** | `logger`, `validators`, `onMetrics` on every adapter |

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

- [Fetchit](/fetchit/)
- [Logit](/logit/)
- [Validit](/validit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
