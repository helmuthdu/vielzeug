---
description: Typed browser storage with a compact API for LocalStorage, SessionStorage, Cookie, IndexedDB, and Memory.
package: deposit
category: storage
keywords: [indexeddb, localstorage, storage, offline, ttl, query, schema, cookie, session]
related: [fetchit, logit, toolkit]
exports: [createLocalStorage, createSessionStorage, createCookie, createIndexedDB, createMemory, table]
---

# @vielzeug/deposit

> Typed browser storage with a compact API for LocalStorage, SessionStorage, Cookie, IndexedDB, and Memory.

[![npm version](https://img.shields.io/npm/v/@vielzeug/deposit)](https://www.npmjs.com/package/@vielzeug/deposit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/deposit` &nbsp;·&nbsp; **Category:** Storage

**Key exports:** `createLocalStorage`, `createSessionStorage`, `createCookie`, `createIndexedDB`, `createMemory`, `table`

**When to use:** Typed browser storage with a compact API for LocalStorage, SessionStorage, Cookie, IndexedDB, and Memory.

**Related:** [@vielzeug/fetchit](https://vielzeug.dev/fetchit/) · [@vielzeug/logit](https://vielzeug.dev/logit/) · [@vielzeug/toolkit](https://vielzeug.dev/toolkit/)

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
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema = {
  users: table<User>('id'),
};

const db = createIndexedDB({ dbName: 'my-app', schema, schemaVersion: 1 });

await db.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

const first = await db.query('users').between('age', 18, 99).orderBy('name').first();
const exists = await db.has('users', 1);
```

## Documentation

- [Overview](https://vielzeug.dev/deposit/)
- [Usage Guide](https://vielzeug.dev/deposit/usage)
- [API Reference](https://vielzeug.dev/deposit/api)
- [Examples](https://vielzeug.dev/deposit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
