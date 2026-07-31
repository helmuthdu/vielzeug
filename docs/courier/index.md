---
title: Courier — HTTP, queries, and streaming
description: A framework-neutral fetch client with explicit query handles, direct mutations, and abortable streams.
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

Native `fetch` leaves request policy, cached reads, and streaming lifecycles to each application. Courier
keeps those concerns in one client while requiring every query's data source to remain explicit.

```ts
// Before
const response = await fetch(`/api/users/${userId}`);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const user = await response.json();

// After
const user = courier.queries.create({
  key: ['users', userId],
  fetch: ({ signal }) => courier.get('/users/{id}', { params: { id: userId }, signal }),
});
await user.fetch();
```

| Feature | Courier | TanStack Query | ky |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="courier" type="size" /> | Framework adapter required | Separate package |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Native fetch transport | <ore-icon name="check" size="16"></ore-icon> | Bring your own | <ore-icon name="check" size="16"></ore-icon> |
| Explicit query handles | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| SSE and NDJSON iteration | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| External runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Courier when** one application client should own typed HTTP, cache policy, direct write operations,
and abortable response streams.

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

Create one client for an application or request scope, then register a query handle for each cached read.

```ts
import { CourierHttpError, createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com', query: { staleTime: 30_000 } });
const user = courier.queries.create<User>({
  key: ['users', 42],
  fetch: ({ signal }) => courier.get('/users/{id}', { params: { id: 42 }, signal }),
});

try {
  await user.fetch();
  console.log(user.getSnapshot().data);
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
- **`queries.create()`** — stable handles with cached snapshots, subscriptions, invalidation, and explicit refetching.
- **`mutate()`** — retryable write operations with a cache callback, without a second state-store abstraction.
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

- [Flux](/flux/) — adapts Courier query handles and event iterators into composable streams.
- [Ripple](/ripple/) — stores Courier snapshots in fine-grained reactive state.
- [Spell](/spell/) — validates parsed HTTP payloads through Courier's schema option.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
