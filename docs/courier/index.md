---
title: Courier — HTTP, queries, and streaming
description: A framework-neutral fetch client with explicit cache keys, direct mutations, and abortable streams.
package: courier
category: http
keywords: [http-client, fetch, caching, queries, mutations, sse, streaming, interceptors]
related: [flux, ripple, spell]
exports:
  [
    createCourier,
    CourierError,
    CourierHttpError,
    CourierNetworkError,
    CourierTimeoutError,
    CourierAbortError,
    CourierSchemaValidationError,
    withBearerAuth,
    withRequestId,
    withLogging,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="courier" />

## Why Courier?

Native `fetch` leaves request policy, cached reads, and stream lifecycles to each application. Courier keeps
those concerns in one client while making cache identity and fetch policy explicit at every cached read.

```ts
// Before
const response = await fetch(`/api/users/${userId}`);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const user = await response.json();

// After
await courier.queries.fetch({
  key: ['users', userId],
  fetch: ({ signal }) => courier.get('/users/{id}', { params: { id: userId }, signal }),
});
```

| Feature | Courier | TanStack Query | ky |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="courier" type="size" /> | Framework adapter required | Separate package |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Native fetch transport | <ore-icon name="check" size="16"></ore-icon> | Bring your own | <ore-icon name="check" size="16"></ore-icon> |
| Explicit cache keys | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| SSE and NDJSON iteration | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| External runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Courier when** one application client should own typed HTTP, explicit cached reads, direct writes, and
abortable response streams.

**Consider TanStack Query when** you need a maintained framework adapter or advanced cache features such as
infinite queries. **Consider ky when** you only need a compact fetch wrapper without caching or streams.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/courier
```

```sh [npm]
npm install @vielzeug/courier
```

```sh [yarn]
yarn add @vielzeug/courier
```

:::

## Quick Start

Create one client for an application or request scope, then fetch a cache entry by its explicit key.

```ts
import { CourierHttpError, createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com', query: { staleTime: 30_000 } });
const key = ['users', 42] as const;

try {
  await courier.queries.fetch({
    key,
    fetch: ({ signal }) => courier.get('/users/{id}', { params: { id: 42 }, signal }),
  });
  console.log(courier.queries.getSnapshot<User>(key)?.data);
} catch (error) {
  if (CourierHttpError.is(error, 404)) console.log('User not found');
  else throw error;
} finally {
  courier.dispose();
}
```

## Features

<div class="features-grid">

- **`createCourier()`** — one lifecycle, interceptor pipeline, header store, and cancellation boundary.
- **`get()` / `post()` / `request()`** — typed paths, query strings, request bodies, validation, and structured errors.
- **`queries.fetch()`** — key-based cached reads, subscriptions, invalidation, and explicit revalidation.
- **`mutate()`** — direct write operation with a cache callback, without hidden retries or a second state store.
- **`events()` / `read()`** — abortable SSE, text, and NDJSON iteration with normalized request errors.
- **`withBearerAuth()` / `withRequestId()` / `withLogging()`** — composable transport policies.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Flux](/flux/) — adapts Courier cache entries and event iterators into composable streams.
- [Ripple](/ripple/) — stores Courier snapshots in fine-grained reactive state.
- [Spell](/spell/) — validates parsed HTTP payloads through Courier's schema option.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
