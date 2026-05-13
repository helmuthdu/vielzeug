---
title: Sourceit — Reactive Query Sources
description: Typed local and remote data sources for pagination, filtering, sorting, and search.
---

<PackageBadges package="sourceit" />

<img src="/logo-sourceit.svg" alt="Sourceit logo" width="156" class="logo-highlight"/>

`@vielzeug/sourceit` provides lightweight, typed source models for list-like UIs:

- `createLocalSource()` for in-memory collections
- `createRemoteSource()` for async server-backed collections

Both expose a consistent read model (`current`, `meta`, `snapshot`) and mutation model (`goTo`, `search`, `setFilter`, `setSort`, `setLimit`, `update`).

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sourceit
```

```sh [npm]
npm install @vielzeug/sourceit
```

```sh [yarn]
yarn add @vielzeug/sourceit
```

:::

## Quick Start

```ts
import { createLocalSource } from '@vielzeug/sourceit';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  { limit: 2 },
);

source.search('a', true);
console.log(source.current); // [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]
console.log(source.meta.pageNumber); // 1
```

```ts
import { createRemoteSource } from '@vielzeug/sourceit';

const remote = createRemoteSource({
  fetch: async ({ limit, page, search }) => {
    const result = await api.users.list({ limit, page, search });

    return { items: result.items, total: result.total };
  },
  limit: 20,
});

remote.refresh();
await remote.ready();
```

## Why Sourceit?

- Typed and small API surface
- Deterministic pagination/search behavior
- Local and remote sources with aligned usage patterns
- URL sync helpers via query param encode/decode
- Selector subscriptions via utility (`subscribeSelector`)

## Compatibility

| Environment | Support |
| --- | --- |
| Browser | ✅ |
| Node.js | ✅ |
| SSR | ✅ |

## See Also

- [Stateit](/stateit/)
- [Toolkit](/toolkit/)
- [Routeit](/routeit/)
