---
title: Courier — HTTP client
description: A framework-neutral HTTP client with explicit cached reads, prefetching, immutable middleware, typed paths, and structured errors.
package: courier
category: http
keywords: [http-client, fetch, cache, prefetch, middleware, interceptors, errors]
related: [flux, spell, postmaster]
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

Native `fetch` leaves request policy, error classification, middleware composition, and repeated-read coordination to each application. Courier keeps those concerns in one client, including explicit cached GETs and warm-cache prefetching, while observable query and mutation state remain consumer-owned.

```ts
// Before
const response = await fetch(`/api/users/${userId}`);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const user = await response.json();

// After
const user = await courier.get<User>('/users/{id}', { params: { id: userId } });
```

| Feature | Courier | ky | ofetch |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="courier" type="size" /> | Separate package | Separate package |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Native fetch transport | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Explicit parsed-value cache and prefetch | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Immutable middleware at construction | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Structured error taxonomy | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |

<div class="decision-callout">

**Use Courier when** one client should own typed HTTP, explicit cached GETs and prefetching, immutable middleware, and structured errors — while a separate state layer owns observable queries and mutations.

**Consider ky when** you only need a compact fetch wrapper. **Consider ofetch when** you want a bundled fetch utility with its own retry and caching conventions.

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

Create one transport client for an application or request scope, then use method conveniences for standard HTTP methods and `request()` for custom methods.

```ts
import { CourierHttpError, createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });

try {
  const user = await courier.get<User>('/users/{id}', { params: { id: 42 } });
  console.log(user.name);
} catch (error) {
  if (CourierHttpError.is(error, 404)) console.log('User not found');
  else throw error;
} finally {
  courier.dispose();
}
```

## Features

<div class="features-grid">

- **`createCourier()`** — one lifecycle, immutable middleware pipeline, header defaults, and cancellation boundary.
- **`request()`** — one contract for every HTTP method; pass `method` in the config.
- **Cached `get()`** — opt in with a structured key and optional per-read TTL; successful parsed values share bounded storage and in-flight work.
- **`prefetch()`** — await cache warming while request failures remain observable through `tap()`.
- **`invalidateCache()` / `clearCache()`** — invalidate structured key prefixes without query state.
- **`get()` / `post()` / `put()` / `patch()` / `delete()`** — conveniences for standard methods.
- **`withBearerAuth()` / `withRequestId()` / `withLogging()`** — composable middleware configured at construction.
- **`tap()`** — signal-owned structured transport observation.
- **Error taxonomy** — HTTP, network, timeout, abort, parse, and schema failures are distinct, actionable classes.
- **`cancelAll()` / `dispose()`** — abort active requests and tear down the transport.

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

- [Flux](/flux/) — composes async streams; pair with Courier transport calls in the owning state layer.
- [Spell](/spell/) — validates parsed HTTP payloads through Courier's `schema` option.
- [Postmaster](/postmaster/) — coordinates durable delivery of Courier requests through a job outbox.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
