---
title: Sourcerer — Reactive collection sources
description: Framework-agnostic local and remote collection state with page, cursor, and infinite pagination.
package: sourcerer
category: data
keywords: [pagination, data-source, cursor, infinite-scroll, collection]
related: [courier, ripple, scout, wayfinder]
exports:
  [
    createCursorSource,
    createInfiniteSource,
    createLocalSource,
    createPageSource,
    CursorLoadContext,
    CursorPagination,
    CursorResult,
    CursorSource,
    CursorSourceConfig,
    CursorSourceState,
    InfiniteLoadContext,
    InfinitePagination,
    InfiniteSource,
    InfiniteSourceConfig,
    InfiniteSourceState,
    LocalSource,
    LocalSourceConfig,
    LocalSourceState,
    PageLoadContext,
    PagePagination,
    PageResult,
    PageSource,
    PageSourceConfig,
    PageSourceState,
    SourcererError,
    SourcererConfigurationError,
    SourcererDisposedError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sourcerer" />

## Why Sourcerer?

Paginated views need collection data, loading state, errors, parameters, and navigation to change coherently. Sourcerer owns that state and request succession without coupling it to a framework or transport client.

```ts
// Before
let items = [];
let loading = false;
let page = 1;

// After
const source = createPageSource({
  load: async ({ page, pageSize }) => ({ items: await loadUsers(page, pageSize), totalItems: 100 }),
});
source.subscribe((state) => render(state));
```

| Feature | Sourcerer | Manual store | General query cache |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="sourcerer" type="size" /> | Application-defined | Package-defined |
| Zero runtime dependencies | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Page, cursor, and infinite navigation | <ore-icon name="check" size="16"></ore-icon> | Application-defined | Application-defined |
| Framework-neutral subscriptions | <ore-icon name="check" size="16"></ore-icon> | Application-defined | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| HTTP transport policy | Loader-defined | Application-defined | Loader-defined |

<div class="decision-callout">

**Use Sourcerer when** a collection view needs explicit pagination, observable state, cancellation, and lifecycle ownership.

**Consider a general query cache when** your primary requirement is shared keyed caching, invalidation, mutations, or server-state normalization rather than collection navigation.

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

Create a page source, load it, read its state, and dispose it with its owner.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };
const users: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];
const source = createPageSource({
  load: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    return { items: users.slice(start, start + pageSize), totalItems: users.length };
  },
  pageSize: 1,
});

try {
  await source.reload();
  console.log(source.state.items);
} catch (error) {
  console.error(error);
} finally {
  source.dispose();
}
```

## Features

<div class="features-grid">

- `createLocalSource()` — filters and paginates an in-memory collection synchronously
- `createPageSource()` — loads numbered pages and exposes direct navigation commands
- `createCursorSource()` — follows opaque cursors returned by the loader
- `createInfiniteSource()` — appends pages while preserving loaded items
- `setParams()` — replaces consumer-owned loader parameters and resets pagination
- `subscribe()` — publishes complete immutable state replacements

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Courier](/courier/) — provide HTTP transport, middleware, and structured transport errors inside loaders
- [Scout](/scout/) — index larger in-memory collections before passing matches to a local source
- [Ripple](/ripple/) — project source state into reactive computations
- [Wayfinder](/wayfinder/) — validate and synchronize source parameters with route state

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
