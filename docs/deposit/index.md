---
title: Deposit — Minimal Typed Browser Storage
description: Typed browser storage with a compact API for IndexedDB and LocalStorage.
---

<!-- markdownlint-disable MD033 -->
<PackageBadges package="deposit" />
<!-- markdownlint-enable MD033 -->

`@vielzeug/deposit` is a minimal storage layer for browser apps with a deliberately small API.

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

## Why Deposit

- Typed table schemas via `Schema<S>`
- Two backends with one interface (`createLocalStorage`, `createIndexedDB`)
- Compact query builder for common read patterns
- TTL on writes
- Atomic IndexedDB transactions

## Quick Example

```ts
import { createIndexedDB, type Schema } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };

const schema: Schema<{ users: User }> = {
  users: { key: 'id' },
};

const db = createIndexedDB({ dbName: 'app', version: 1, schema });

await db.put('users', { id: 1, name: 'Alice', age: 30 });
const adults = await db.from('users').between('age', 18, 99).toArray();
```

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ⚠️      |
| SSR         | ⚠️      |

Notes:

- `createLocalStorage` requires `localStorage`.
- `createIndexedDB` requires `indexedDB`.

## Next

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
