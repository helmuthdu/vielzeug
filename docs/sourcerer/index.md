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
    applyQuery,
    SourceDisposedError,
    SourceError,
    SourceTimeoutError,
    sourceState,
    itemRange,
    prefetchSource,
    prefetchSourceAndKeep,
    FetchEvent,
    SearchOptions,
    filterContains,
    filterEquals,
    filterRange,
    sortBy,
    encodeQuery,
    decodeQuery,
    DecodeQueryOptions,
    LocalSourceQuery,
    LocalSourceConfig,
    LocalSource,
    RemoteSource,
    RemoteConfig,
    RemoteSourceQuery,
    CursorSource,
    CursorConfig,
    CursorSourceQuery,
    InfiniteSource,
    InfiniteConfig,
    InfiniteSourceQuery,
    DerivedSource,
    MergedSource,
    ReactiveSource,
    PageNavigator,
    SourceQuery,
    SourceMeta,
    CursorMeta,
    InfiniteMeta,
    SourceState,
    SourceSnapshot,
    SourceErrorContext,
    RetryConfig,
    QueryParams,
    QueryParamsInput,
    Predicate,
    Sorter,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sourcerer" />

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
await source.search(search, { immediate: true });
// source.current, source.meta.pageCount — both cases handled
```

| Feature                             | Sourcerer                                       | TanStack Query                             | SWR                                                             |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| Bundle size                         | <PackageInfo package="sourcerer" type="size" /> | ~16 kB                                     | ~6 kB                                                           |
| In-memory source primitive          | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>                          |
| Remote source primitive             | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>                      |
| Cursor-based pagination             | <ore-icon name="check" size="16"></ore-icon>      | Partial                                    | Partial                                                         |
| Infinite scroll source              | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>                      |
| Typed page/filter/sort/search model | <ore-icon name="check" size="16"></ore-icon>      | Partial                                    | Partial                                                         |
| Optimistic updates                  | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>                      |
| URL query encode/decode helpers     | <ore-icon name="check" size="16"></ore-icon>      | Partial                                    | Partial                                                         |
| Framework agnostic                  | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> React-first |

<div class="decision-callout">

**Use Sourcerer when** you want one typed source abstraction for both local collections and server-backed lists, with built-in support for pagination, search, filters, and optimistic mutation.

**Consider TanStack Query when** your data layer is already built around query keys, cache invalidation across many components, and React-first DevTools integration.

</div>

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

await source.search('ada', { immediate: true });
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

## Features

<div class="features-grid">

| Factory                  | Data model      | Navigation          | Key extras                                                          |
| ------------------------ | --------------- | ------------------- | ------------------------------------------------------------------- |
| `createLocalSource()`    | In-memory array | Page number         | `filterAsync`, `sortAsync`, `patch()`, custom `searchFn`, `ready()` |
| `createRemoteSource()`   | Server fetch    | Page number         | `staleTime`, `optimisticUpdate`, `patch()`, `ready()`, `queryKey`   |
| `createCursorSource()`   | Server fetch    | Cursor tokens       | `patch()`, `ready()`, `queryKey`                                    |
| `createInfiniteSource()` | Server fetch    | Append (`loadMore`) | `patch()`, `loadedPages`, `ready()`, `queryKey`                     |

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — reactive signals; Sourcerer's loading, error, and data state are exposed as signals for framework-agnostic UI binding
- [Arsenal](/arsenal/) — utility functions used inside Sourcerer's fetch and transform pipelines
- [Wayfinder](/wayfinder/) — client-side router; sync Sourcerer's pagination and filter state with URL search params

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
