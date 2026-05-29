---
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session, reactive, signals]
related: [courier, rune, ripple, sieve, toolkit]
exports: [createLocalStorage, createSessionStorage, createIndexedDB, createMemory, table, ttl, scheduleExpiredPrune, DepositError, DepositDisposedError, DepositMigrationError, DepositQuotaError, DepositScopeError]
---

# @vielzeug/deposit

> Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`, `scheduleExpiredPrune`

**When to use:** Structured, queryable browser storage with TTL, reactivity, and TypeScript types.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/sieve](https://vielzeug.dev/sieve/) · [@vielzeug/toolkit](https://vielzeug.dev/toolkit/)

</details>

`@vielzeug/deposit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/deposit
npm install @vielzeug/deposit
yarn add @vielzeug/deposit
```

## Quick Start

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema = {
  users: table<User>('id'),
};

const db = createIndexedDB({ name: 'my-app', schema, version: 1 });

await db.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

// TTL — always use the ttl.* helpers
await db.put('users', { id: 3, name: 'Carol', age: 28 }, ttl.hours(1));

const first = await db.query('users').between('age', 18, 99).orderBy('name').first();
const exists = await db.has('users', 1);

void first;
void exists;
```

## Documentation

- [Overview](https://vielzeug.dev/deposit/)
- [Usage Guide](https://vielzeug.dev/deposit/usage)
- [API Reference](https://vielzeug.dev/deposit/api)
- [Examples](https://vielzeug.dev/deposit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
