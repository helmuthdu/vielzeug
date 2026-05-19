---
title: Deposit — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session]
related: [fetchit, logit, toolkit]
exports: [createLocalStorage, createSessionStorage, createIndexedDB, createMemory, table]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="deposit" />

<img src="/logo-deposit.svg" alt="Deposit logo" width="156" class="logo-highlight"/>

# Deposit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`

**When to use:** Structured, queryable browser storage with TTL and TypeScript types.

**Related:** [Fetchit](/fetchit/) · [Logit](/logit/) · [Toolkit](/toolkit/)

</details>

`@vielzeug/deposit` is a compact, typed storage layer with four adapters:

- `createLocalStorage({ name, schema })` for lightweight browser persistence
- `createSessionStorage({ name, schema })` for tab-scoped persistence
- `createIndexedDB({ name, schema, version })` for transactional storage
- `createMemory({ schema })` for tests and SSR environments

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

const db = createIndexedDB({ name: 'app', schema, version: 1 });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
const first = await db.query('users').between('age', 18, 99).first();

void first;
```

## Why Deposit?

Native browser storage APIs are powerful but inconsistent and repetitive to use directly.

- Typed table schemas via `table<T>()`
- Unified adapter API across LocalStorage, SessionStorage, IndexedDB, and Memory
- Compact query builder for common read patterns (`toArray`, `count`, `first`, `delete`)
- TTL on writes
- Atomic multi-table transactions and cross-tab updates (IndexedDB)

## Features

- **Typed schemas** — `table<T>(key)` with inferred key and record types
- **Adapter parity** — one API for LocalStorage, SessionStorage, IndexedDB, and Memory
- **Chainable queries** — `equals`, `between`, `startsWith`, `orderBy`, `limit`, `offset`
- **Terminal query actions** — `toArray`, `count`, `first`, `delete`
- **TTL support** — `ttl.ms/seconds/minutes/hours/days` or plain ms numbers
- **Reactivity** — `observe(table, listener, { initialEmit? })`
- **Transactional writes** — `transaction()` with rollback on callback failure
- **Zero dependencies** — small and easy to audit

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅ |
| Node.js     | ⚠️ (`createMemory` works; browser adapters require web APIs) |
| SSR         | ⚠️ (`createMemory` works directly; browser adapters require polyfills) |

Notes:

- `createLocalStorage` requires `localStorage`.
- `createSessionStorage` requires `sessionStorage`.
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
