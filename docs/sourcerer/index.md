---
title: Sourcerer — Reactive Query Sources
description: Typed reactive data sources for pagination, filtering, sorting, search, and infinite scroll.
package: sourcerer
category: data
keywords: [pagination, filtering, sorting, search, data-source, query, remote, local, cursor, infinite-scroll]
related: [courier, ripple, wayfinder]
exports:
  [
    createLocalSource,
    createRemoteSource,
    createCursorSource,
    createInfiniteSource,
    deriveSource,
    mergeSource,
    toSignals,
    SourceError,
    SourceTimeoutError,
    sourceState,
    itemRange,
    prefetchSource,
    prefetchSourceWithSource,
    composeFetch,
    filterContains,
    filterEquals,
    filterRange,
    sortBy,
    encodeQuery,
    decodeQuery,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="sourcerer" />

<img src="/logo-sourcerer.svg" alt="Sourcerer logo" width="156" class="logo-highlight"/>

# Sourcerer

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/sourcerer` &nbsp;·&nbsp; **Category:** Data

**Key exports:** `createLocalSource`, `createRemoteSource`, `createCursorSource`, `createInfiniteSource`, `toSignals`, `SourceError`, `itemRange`, `sourceState`

**When to use:** Typed, reactive list models with consistent pagination, filtering, sorting, and search across local and remote data.

**Related:** [Courier](/courier/) · [Ripple](/ripple/) · [Wayfinder](/wayfinder/)

</details>

`@vielzeug/sourcerer` provides typed, reactive source models for list-based UIs:

- `createLocalSource()` — in-memory collections with synchronous filter/sort/search (optional async filter/sort via `filterAsync`/`sortAsync`)
- `createRemoteSource()` — async server-backed collections with page-number navigation
- `createCursorSource()` — async collections navigated by cursor tokens (opaque next/prev pointers)
- `createInfiniteSource()` — append-mode (infinite scroll) collections
- `toSignals()` — universal Ripple signal adapter for all source types
- `SourceError` — structured error class with `message`, `cause`, `query`, and `attempt`
- `sourceState()` — derive a discriminated union (`loading` / `error` / `success`) from any source
- `itemRange()` — compute 1-based display range from `SourceMeta`

All sources expose `current`, `meta`, and `subscribe` — UI code is identical regardless of the underlying data strategy.

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

await source.searchNow('a');
console.log(source.current); // [{ id: 1, name: 'Ada' }]
console.log(source.meta.pageNumber); // 1
```

```ts
import { createRemoteSource } from '@vielzeug/sourcerer';

const source = createRemoteSource({
  fetch: async ({ filter, limit, page, search, sort }, signal) => {
    const res = await fetch(`/api/users?page=${page}&limit=${limit}`, { signal });
    return res.json(); // { items: User[], total: number }
  },
  limit: 20,
});

// autoFetch is true by default — initial data loads immediately
await source.ready();
console.log(source.current, source.meta.totalItems);
```

## Why Sourcerer?

Managing paginated lists across local and remote data usually means writing different state models for each case, wiring separate loading flags, and duplicating URL serialization logic. Sourcerer provides one typed contract — `current`, `meta`, and `subscribe` — that works the same whether data lives in memory or comes from a server.

```ts
// Without Sourcerer — manual local list state
const [items, setItems] = useState(allUsers);
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const pageSize = 10;
const filtered = items.filter((u) => u.name.includes(search));
const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
const totalPages = Math.ceil(filtered.length / pageSize);
// ... repeat for remote with loading/error/abort logic ...

// With Sourcerer — same API for both
const source = createLocalSource(allUsers, { limit: 10 }); // or createRemoteSource(...)
await source.searchNow(search);
// source.current, source.meta.pageCount — both cases handled
```

| Feature                             | Sourcerer                                       | TanStack Query | SWR            |
| ----------------------------------- | ----------------------------------------------- | -------------- | -------------- |
| Bundle size                         | <PackageInfo package="sourcerer" type="size" /> | ~16 kB         | ~6 kB          |
| In-memory source primitive          | ✅                                              | ❌             | ❌             |
| Remote source primitive             | ✅                                              | ✅             | ✅             |
| Cursor-based pagination             | ✅                                              | Partial        | Partial        |
| Infinite scroll source              | ✅                                              | ✅             | ✅             |
| Typed page/filter/sort/search model | ✅                                              | Partial        | Partial        |
| Optimistic updates                  | ✅                                              | ✅             | ✅             |
| URL query encode/decode helpers     | ✅                                              | Partial        | Partial        |
| Framework agnostic                  | ✅                                              | ✅             | ⚠️ React-first |

**Use Sourcerer when** you want one typed source abstraction for both local collections and server-backed lists, with built-in support for pagination, search, filters, and optimistic mutation.

**Consider TanStack Query when** your data layer is already built around query keys, cache invalidation across many components, and React-first DevTools integration.

## Features

| Factory                  | Data model      | Navigation          | Key extras                                                             |
| ------------------------ | --------------- | ------------------- | ---------------------------------------------------------------------- |
| `createLocalSource()`    | In-memory array | Page number         | `filterAsync`, `sortAsync`, `ready()`, custom `searchFn`               |
| `createRemoteSource()`   | Server fetch    | Page number         | `staleTime`, `optimisticUpdate`, `restoreQuery`, `ready()`, `queryKey` |
| `createCursorSource()`   | Server fetch    | Cursor tokens       | `restoreQuery()`, `ready()`, `queryKey`                                |
| `createInfiniteSource()` | Server fetch    | Append (`loadMore`) | `loadedPages`, `ready()`, `queryKey`                                   |

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/)
- [Arsenal](/arsenal/)
- [Wayfinder](/wayfinder/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
