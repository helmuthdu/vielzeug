---
title: Fetchit — HTTP client for TypeScript
description: Lightweight, type-safe HTTP client with query caching, request deduplication, and standalone mutations. Built on the native fetch API. Zero dependencies.
---

<PackageBadges package="fetchit" />

<img src="/logo-fetchit.svg" alt="Fetchit Logo" width="156" class="logo-highlight"/>

# Fetchit

**Fetchit** provides three independent primitives built on the native `fetch` API: an HTTP client, a query cache, and standalone mutations. Use any combination based on your needs.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/fetchit
```

```sh [npm]
npm install @vielzeug/fetchit
```

```sh [yarn]
yarn add @vielzeug/fetchit
```

:::

## Quick Start

```ts
import { createApi, createQuery, createMutation } from '@vielzeug/fetchit';

const api = createApi({ baseUrl: 'https://api.example.com' });

// GET with typed response
const users = await api.get<User[]>('/users');

// Type-safe path parameters — TypeScript errors if params are wrong or missing
const user = await api.get<User>('/users/{id}', { params: { id: 42 } });

// Cached query — second call within staleTime returns immediately from cache
const qc = createQuery({ staleTime: 5_000 });
const post = await qc.query({
  key: ['users', 42],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 42 }, signal }),
});

// Standalone mutation with cache invalidation on success
const createUser = createMutation(
  (data: NewUser) => api.post<User>('/users', { body: data }),
  { onSuccess: () => qc.invalidate(['users']) },
);
await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

## Features

- **Type-safe path params** — `{param}` placeholders extracted and validated at compile time
- **HTTP client** — `createApi()` with base URL, global headers, timeout, interceptors, and deduplication
- **Query cache** — `createQuery()` for stale-while-revalidate caching, prefix invalidation, and reactive subscriptions
- **Standalone mutations** — `createMutation()` with lifecycle callbacks, retry, and observable state
- **Request deduplication** — GET/HEAD/OPTIONS always deduplicate concurrent identical calls; others opt-in
- **Interceptors** — `use()` middleware for auth tokens, logging, and request transforms
- **Retry with backoff** — configurable attempt count and exponential delay strategy
- **Abort support** — `QueryFnContext` passes an `AbortSignal` to every query function
- **Disposable** — both clients implement `[Symbol.dispose]` for `using` declarations
- **Zero dependencies** — <PackageInfo package="fetchit" type="size" /> gzipped

## Next Steps

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| [Usage Guide](./usage.md) | HTTP client, query client, mutations, interceptors, and more |
| [API Reference](./api.md) | Complete type signatures and method documentation            |
| [Examples](./examples.md) | Real-world data-fetching patterns                            |
