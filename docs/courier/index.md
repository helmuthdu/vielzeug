---
title: Courier — HTTP, queries, SSE, and streaming
description: Type-safe HTTP, query cache, mutations, SSE, and readable streaming built on native fetch.
package: courier
category: http
keywords:
  [
    http-client,
    fetch,
    caching,
    deduplication,
    mutations,
    query-cache,
    rest,
    sse,
    streaming,
    interceptors,
    persist,
    batcher,
  ]
related: [spell, ripple, vault]
exports:
  [
    createApi,
    createCourier,
    createMutation,
    createQuery,
    createStream,
    createTransportCore,
    HttpError,
    NO_RETRY,
    bindRefetch,
    createBatcher,
    withBearerAuth,
    withRequestId,
    withLogging,
    persistQueryCache,
    hydrateQueryCache,
    resolveRetryDelay,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="courier" />

<img src="/logo-courier.svg" alt="Courier logo" width="156" class="logo-highlight"/>

# Courier

<details>
<summary><sg-icon name="zap" size="16"></sg-icon> Quick Reference</summary>

**Package:** `@vielzeug/courier` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createApi`, `createCourier`, `createQuery`, `createMutation`, `createStream`, `createTransportCore`, `HttpError`, `NO_RETRY`, `bindRefetch`, `createBatcher`, `withBearerAuth`, `persistQueryCache`, `hydrateQueryCache`

**When to use:** Typed HTTP, caching, mutations, SSE, and readable streaming with one shared fetch-based transport.

**Related:** [Spell](/spell/) · [Ripple](/ripple/) · [Vault](/vault/)

</details>

`@vielzeug/courier` ships composable primitives on top of native `fetch`: REST requests, query caching, tracked mutations, SSE, readable streams, and a unified `createCourier()` factory.

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

```ts
import { createCourier } from '@vielzeug/courier';

type NewUser = { name: string };
type User = { id: number; name: string };

const client = createCourier({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 30_000 },
});

const user = await client.query.fetch({
  key: ['users', 42],
  fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id: 42 }, signal }),
});

const createUser = client.mutation((input: NewUser, signal) =>
  client.api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
client.query.set(['users', nextUser.id], nextUser);
client.query.invalidate(['users']);
```

## Why Courier?

Native `fetch` is excellent but low-level. Courier adds typed path params, a query cache, tracked mutations, SSE, readable streaming, and a shared interceptor pipeline without external dependencies.

```ts
// Before — raw fetch
const res = await fetch(`https://api.example.com/users/${userId}`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const user: User = await res.json();

// After — Courier
const client = createCourier({ baseUrl: 'https://api.example.com' });
const user = await client.api.get<User>('/users/{id}', { params: { id: userId } });
```

| Feature               | Courier                                       | axios          | ky     |
| --------------------- | --------------------------------------------- | -------------- | ------ |
| Bundle size           | <PackageInfo package="courier" type="size" /> | ~26 kB         | ~5 kB  |
| Built on              | fetch                                         | XMLHttpRequest | fetch  |
| Type-safe path params | <sg-icon name="circle-check" size="16"></sg-icon>                                            | Manual         | Manual |
| Query cache           | <sg-icon name="circle-check" size="16"></sg-icon>                                            | <sg-icon name="circle-x" size="16"></sg-icon>             | <sg-icon name="circle-x" size="16"></sg-icon>     |
| SSE + streaming       | <sg-icon name="circle-check" size="16"></sg-icon>                                            | <sg-icon name="circle-x" size="16"></sg-icon>             | <sg-icon name="circle-x" size="16"></sg-icon>     |
| Standalone mutations  | <sg-icon name="circle-check" size="16"></sg-icon>                                            | <sg-icon name="circle-x" size="16"></sg-icon>             | <sg-icon name="circle-x" size="16"></sg-icon>     |
| Zero dependencies     | <sg-icon name="circle-check" size="16"></sg-icon>                                            | <sg-icon name="circle-x" size="16"></sg-icon>             | <sg-icon name="circle-x" size="16"></sg-icon>     |

**Use Courier when** your app needs typed HTTP, a query cache, tracked mutations, or SSE — especially when you want all of these sharing one interceptor pipeline and zero extra dependencies.

**Consider axios when** you need to support IE11 or other XMLHttpRequest-based environments, or you already have a large axios-specific codebase.

## Features

- **Unified client** — `createCourier()` combines `api`, `stream`, `query`, and `mutation()` behind one shared transport
- **HTTP client** — `createApi()` with base URL, global headers, interceptors, timeout, deduplication, and `cancelAll()`
- **SSE** — `createStream().sse()` with typed events, `Last-Event-ID` reconnects, and shared interceptors
- **Readable HTTP streams** — `stream.readable()` for raw text or NDJSON chunk parsing
- **Query cache** — `createQuery()` with `fetch()`, prefix invalidation, background revalidation, and stable query keys
- **SyncStore integration** — `query.watch()` and `mutation.toStore()` work with React, Vue, and Svelte adapters
- **Standalone mutations** — `createMutation()` with retry, lifecycle callbacks, cancellation, and observable state
- **Shared transport core** — `createTransportCore()` powers both `createApi()` and `createStream()` for advanced use cases
- **Request deduplication** — idempotent requests dedupe by method + URL + response type, with `dedupe: false` to opt out
- **DataLoader-style batcher** — `createBatcher()` coalesces N individual `load()` calls into one batch request
- **Interceptor presets** — `withBearerAuth()`, `withRequestId()`, and `withLogging()` ready to plug in via `use()`
- **Focus/reconnect binding** — `bindRefetch(qc)` wires up tab visibility and network events; fully opt-in
- **Cache persistence** — `persistQueryCache()` and `hydrateQueryCache()` for cross-reload cache survival
- **Structured errors** — `HttpError` captures HTTP, network, abort, and timeout failures
- **Disposable** — clients implement `[Symbol.dispose]` for deterministic cleanup

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | <sg-icon name="circle-check" size="16"></sg-icon>      |
| Node.js     | <sg-icon name="circle-check" size="16"></sg-icon>      |
| SSR         | <sg-icon name="circle-check" size="16"></sg-icon>      |
| Deno        | <sg-icon name="circle-check" size="16"></sg-icon>      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Spell](/spell/) — validate HTTP response payloads against typed schemas before they enter your cache
- [Forge](/forge/) — pair with Courier mutations to manage typed form state and submission
- [Ripple](/ripple/) — use signal stores as a reactive layer on top of Courier's `SyncStore` API

<!-- markdownlint-enable MD025 MD033 MD060 -->
