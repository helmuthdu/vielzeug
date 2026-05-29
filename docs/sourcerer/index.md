---
title: Sourcerer — Reactive Query Sources
description: Typed local and remote data sources for pagination, filtering, sorting, and search.
package: sourcerer
category: data
keywords: [pagination, filtering, sorting, search, data-source, query, remote, local]
related: [courier, ripple, route]
exports: [createLocalSource, createRemoteSource]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="sourcerer" />

<img src="/logo-sourcerer.svg" alt="Sourcerer logo" width="156" class="logo-highlight"/>

# Sourcerer

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/sourcerer` &nbsp;·&nbsp; **Category:** Data

**Key exports:** `createLocalSource`, `createRemoteSource`

**When to use:** Reactive local and remote data sources with pagination, filtering, sorting, search, and URL query-param sync.

**Related:** [Courier](/courier/) · [Ripple](/ripple/) · [Route](/route/)

</details>

`@vielzeug/sourcerer` provides lightweight, typed source models for list-like UIs:


- `createLocalSource()` for in-memory collections
- `createRemoteSource()` for async server-backed collections

Both expose a consistent read model (`current`, `meta`, `snapshot`) and mutation model (`goTo`, `search`, `searchNow`, `setFilter`, `setSort`, `setLimit`, `batch`).

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sourcerer
```

```sh [npm]
npm install @vielzeug/sourcerer
```

```sh [yarn]
yarn add @vielzeug/sourcerer
```

:::

## Quick Start

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  { limit: 2 },
);

source.searchNow('a');
console.log(source.current); // [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]
console.log(source.meta.pageNumber); // 1
```

```ts
import { createRemoteSource } from '@vielzeug/sourcerer';

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

## Why Sourcerer?

- Typed and small API surface
- Deterministic pagination/search behavior
- Local and remote sources with aligned usage patterns
- URL sync helpers via query param encode/decode
- Selector subscriptions via utility (`subscribeSelector`)

| Feature                             | Sourcerer                                       | TanStack Query | SWR              |
| ----------------------------------- | ---------------------------------------------- | -------------- | ---------------- |
| Bundle size                         | <PackageInfo package="sourcerer" type="size" /> | ~16 kB         | ~6 kB            |
| Local in-memory source primitive    | ✅                                             | ❌             | ❌               |
| Remote source primitive             | ✅                                             | ✅             | ✅               |
| Typed page/filter/sort/search model | ✅                                             | Partial        | Partial          |
| Shared local + remote API shape     | ✅                                             | ❌             | ❌               |
| URL query encode/decode helpers     | ✅                                             | Partial        | Partial          |
| Framework agnostic                  | ✅                                             | ✅             | ⚠️ (React-first) |
| Zero dependencies                   | ✅                                             | ❌             | ❌               |

**Use Sourcerer when** you want one typed source abstraction for both local collections and server-backed lists.

**Consider query-focused libraries when** your app only needs remote fetching and cache synchronization.

## Features

- Typed local and remote source contracts with a shared API shape
- Deterministic pagination, search, sort, and filter state transitions
- Snapshot/meta/current read model for predictable rendering
- Batch updates for grouped source state changes
- URL query encode/decode helpers for route synchronization
- Selector subscriptions via `subscribeSelector`
- Zero dependencies

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/)
- [Toolkit](/toolkit/)
- [Route](/route/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
