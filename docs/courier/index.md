---
title: Courier — HTTP, queries, SSE, and streaming
description: Type-safe HTTP, query cache, mutations, SSE, and readable streaming built on native fetch.
package: courier
category: http
keywords: [http-client, fetch, caching, deduplication, mutations, query-cache, rest, sse, streaming, interceptors]
related: [sieve, ripple, deposit]
exports: [createApi, createCourier, createMutation, createQuery, createStream, createTransportCore, HttpError]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="courier" />

<img src="/logo-courier.svg" alt="Courier logo" width="156" class="logo-highlight"/>

# Courier

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/courier` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createApi`, `createCourier`, `createQuery`, `createMutation`, `createStream`, `createTransportCore`, `HttpError`

**When to use:** Typed HTTP, caching, mutations, SSE, and readable streaming with one shared fetch-based transport.

**Related:** [Sieve](/sieve/) · [Ripple](/ripple/) · [Deposit](/deposit/)

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
| Type-safe path params | ✅                                            | Manual         | Manual |
| Query cache           | ✅                                            | ❌             | ❌     |
| SSE + streaming       | ✅                                            | ❌             | ❌     |
| Standalone mutations  | ✅                                            | ❌             | ❌     |
| Zero dependencies     | ✅                                            | ❌             | ❌     |

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
- **Retry helpers** — `NO_RETRY`, `runWithRetry()`, `sleepWithAbort()`, and `toError()` are exported
- **Structured errors** — `HttpError` captures HTTP, network, abort, and timeout failures
- **Disposable** — clients implement `[Symbol.dispose]` for deterministic cleanup

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

- [Sieve](/sieve/)
- [Forge](/forge/)
- [Ripple](/ripple/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
