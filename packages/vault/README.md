---
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.
package: vault
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, session, reactive, signals]
related: [courier, rune, ripple, spell, arsenal]
exports: [createLocalStorage, createSessionStorage, createIndexedDB, createMemory, table, ttl, scheduleExpiredPrune, VaultError, VaultDisposedError, VaultMigrationError, VaultQuotaError, VaultScopeError]
---

# @vielzeug/vault

> Typed browser storage with a compact API for LocalStorage, SessionStorage, IndexedDB, and Memory.

[![npm version](https://img.shields.io/npm/v/@vielzeug/vault)](https://www.npmjs.com/package/@vielzeug/vault) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/vault` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`, `scheduleExpiredPrune`

**When to use:** Structured, queryable browser storage with TTL, reactivity, and TypeScript types.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/spell](https://vielzeug.dev/spell/) · [@vielzeug/arsenal](https://vielzeug.dev/arsenal/)

</details>

`@vielzeug/vault` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/vault
npm install @vielzeug/vault
yarn add @vielzeug/vault
```

## Quick Start

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/vault';

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

// observe always fires immediately with the current snapshot, then on each change
const stop = db.observe('users', (rows) => console.log(rows.length));

// stop from outside via AbortController
const controller = new AbortController();
for await (const users of db.watch('users', { signal: controller.signal })) {
  console.log(users.length);
}

void first, stop;
```

## Documentation

- [Overview](https://vielzeug.dev/vault/)
- [Usage Guide](https://vielzeug.dev/vault/usage)
- [API Reference](https://vielzeug.dev/vault/api)
- [Examples](https://vielzeug.dev/vault/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
