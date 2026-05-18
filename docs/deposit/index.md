---
title: Deposit — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, Cookie, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, cookie, session]
related: [fetchit, logit, toolkit]
exports: [createLocalStorage, createSessionStorage, createCookie, createIndexedDB, createMemory, table]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit logo" width="156" class="logo-highlight"/>

# Deposit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createCookie`, `createIndexedDB`, `createMemory`, `table`

**When to use:** Structured, queryable browser storage with TTL and TypeScript types. Unified API across LocalStorage, IndexedDB, cookies, and in-memory.

**Related:** [Fetchit](/fetchit/) · [Logit](/logit/) · [Toolkit](/toolkit/)

</details>

`@vielzeug/deposit` is a compact, typed browser storage library with five interchangeable adapters:

- `createLocalStorage(dbName, schema)` for lightweight browser persistence
- `createSessionStorage(dbName, schema)` for tab-scoped persistence
- `createCookie(dbName, schema, options?)` for small browser state that should ride with requests
- `createIndexedDB()` for transactional storage
- `createMemory(schema)` for tests and SSR environments


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
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema = {
  users: table<User>('id'),
};

const db = createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
const first = await db.query('users').between('age', 18, 99).first();
```

## Why Deposit?

Native browser storage APIs are powerful but inconsistent and repetitive to use directly.

- Typed table schemas via `table<T>()`
- Five backends behind one interface (`createLocalStorage`, `createSessionStorage`, `createCookie`, `createIndexedDB`, `createMemory`)
- Compact query builder for common read patterns
- TTL on writes
- Atomic multi-table transactions and cross-tab updates (IndexedDB)

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';

// Before: direct browser API and manual serialization
localStorage.setItem('users:1', JSON.stringify({ id: 1, name: 'Alice' }));

// After: typed schema + consistent adapter API
const schema = { users: table<User>('id') };
const local = createLocalStorage('app', schema);
await local.put('users', { id: 1, name: 'Alice', age: 30 });
```

| Feature                                                                   | Deposit                                       | Dexie.js            | Native APIs        |
| ------------------------------------------------------------------------- | --------------------------------------------- | ------------------- | ------------------ |
| Bundle size                                                               | <PackageInfo package="deposit" type="size" /> | ~29 kB              | 0 kB               |
| Typed schema ergonomics                                                   | ✅ (`table<T>()`)                             | ✅                  | ❌                 |
| LocalStorage + SessionStorage + Cookie + IndexedDB + Memory under one API | ✅                                            | ❌ (IndexedDB only) | ❌                 |
| Built-in TTL on writes                                                    | ✅                                            | ❌                  | ❌                 |
| Chainable query helpers                                                   | ✅                                            | ✅                  | ❌                 |
| Atomic transactions                                                       | ✅ (IndexedDB adapter)                        | ✅                  | ⚠️ (manual wiring) |

**Use Deposit when** you want a lightweight typed API that can target multiple browser storage backends with built-in TTL.

**Use Dexie.js when** you want a feature-rich IndexedDB-first toolkit and don't need LocalStorage parity in the same abstraction.

**Use native APIs directly when** you need the absolute minimum abstraction and are comfortable handling serialization, keying, migrations, and transaction plumbing yourself.

## Features

- **Typed schemas** — `table<T>(key)` factory, full type inference, no annotation boilerplate
- **Adapter parity** — same `Adapter` surface for LocalStorage, SessionStorage, Cookie, IndexedDB, and Memory
- **Chainable queries** — `equals`, `between`, `startsWith`, `orderBy`, `limit`, `offset`, `first`
- **TTL support** — auto-expire records via `ttl.ms/seconds/minutes/hours/days`
- **Bulk writes** — `putAll()` for atomic batch inserts
- **Existence check** — `has()` without loading the full record
- **Record utilities** — `forEach`, `getOrPut`, `update`, `deleteWhere`
- **Reactivity** — `observe(table, listener, options?)` with immediate snapshot and unsubscribe
- **Transactional writes** — `transaction()` with rollback on callback failure
- **In-memory adapter** — browser-free, zero-setup; ideal for tests and SSR
- **Zero dependencies** — small and easy to audit

## Compatibility

| Environment | Support                                                                |
| ----------- | ---------------------------------------------------------------------- |
| Browser     | ✅                                                                     |
| Node.js     | ⚠️ (`createMemory` works; browser adapters require web APIs)           |
| SSR         | ⚠️ (`createMemory` works directly; browser adapters require polyfills) |

Notes:

- `createLocalStorage` requires `localStorage`.
- `createSessionStorage` requires `sessionStorage`.
- `createCookie` requires `document` and is browser-only.
- `createIndexedDB` requires `indexedDB`.
- `createMemory` has no environment requirements.

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Stateit](/stateit/)
- [Formit](/formit/)
- [Validit](/validit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
