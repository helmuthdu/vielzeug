---
title: Sourcerer — Reactive Query Sources
description: Framework-agnostic collection sources for local, page, cursor, and infinite pagination.
package: sourcerer
category: data
keywords: [pagination, data-source, cursor, infinite-scroll, search]
related: [courier, ripple, scout, wayfinder]
exports:
  [
    createCursorSource,
    createInfiniteSource,
    createLocalSource,
    createPageSource,
    AnyPagination,
    CursorPagination,
    CursorQuery,
    CursorQueryPatch,
    CursorResult,
    CursorSource,
    CursorSourceConfig,
    InfinitePagination,
    InfiniteQuery,
    InfiniteQueryPatch,
    InfiniteSource,
    InfiniteSourceConfig,
    LocalQuery,
    LocalQueryPatch,
    LocalSource,
    LocalSourceConfig,
    PageLoadContext,
    PagePagination,
    PageQuery,
    PageQueryPatch,
    PageResult,
    PageSource,
    PageSourceConfig,
    Predicate,
    Sorter,
    Source,
    SourceSnapshot,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sourcerer" />

## Why Sourcerer?

Lists often combine pagination, search, request cancellation, and render state. Sourcerer gives local arrays and remote loaders one snapshot contract while leaving caching, retries, and transport policy to your application.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };

// Before: query changes can mix old items with new loading and page state.
let items: User[] = [];
let page = 1;
let isLoading = false;

// After: one source publishes internally consistent loaded state.
const source = createPageSource<User>({
  autoStart: false,
  load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }),
});
source.subscribe((snapshot) => console.log(snapshot.data));
source.dispose();
```

| Feature | Sourcerer | Manual list state | Courier query cache |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="sourcerer" type="size" /> | Application-defined | <PackageInfo package="courier" type="size" /> |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Local and remote collections | <ore-icon name="check" size="16"></ore-icon> | Application-defined | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Cursor and infinite pagination | <ore-icon name="check" size="16"></ore-icon> | Application-defined | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Latest-request cancellation | <ore-icon name="check" size="16"></ore-icon> | Application-defined | Transport-level |

<div class="decision-callout">

**Use Sourcerer when** one UI collection needs local or remote pagination with an explicit, framework-independent snapshot contract.

**Consider Courier alone when** you only need cached HTTP queries and pagination state belongs elsewhere.

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

Create a page source, load it, then dispose it with its owner.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };

const source = createPageSource<User>({
  autoStart: false,
  load: async ({ query }) => {
    const users = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Linus' },
    ];
    const start = (query.page - 1) * query.pageSize;

    return { data: users.slice(start, start + query.pageSize), total: users.length };
  },
});

try {
  await source.reload();
  console.log(source.snapshot.data);
} catch (error) {
  console.error(error);
} finally {
  source.dispose();
}
```

## Features

<div class="features-grid">

- `createLocalSource()` — synchronous search and numbered pagination over an array
- `createPageSource()` — numbered remote pages with latest-request cancellation
- `createCursorSource()` — sequential opaque-cursor navigation
- `createInfiniteSource()` — append-only page loading
- `SourceSnapshot` — loaded `query`, `data`, and `pagination` plus optional `pendingQuery`
- `debugSource()` — opt-in `console.debug` observer from `/devtools`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Courier](/courier/) — use as transport, caching, and retry policy inside a page loader
- [Scout](/scout/) — adapt an indexed search matcher for local sources
- [Ripple](/ripple/) — project source snapshots into reactive application state
- [Wayfinder](/wayfinder/) — validate and synchronize page query fields with route state

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
