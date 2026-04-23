---
title: Fetchit — HTTP client for TypeScript
description: Type-safe HTTP client, cache, and lean mutation helper built on native fetch.
---

<PackageBadges package="fetchit" />

<img src="/logo-fetchit.svg" alt="Fetchit logo" width="156" class="logo-highlight"/>

`@vielzeug/fetchit` ships a small set of composable primitives built on native `fetch`: `createApi`, `createQuery`, and `createMutation`.

<!-- Search keywords: HTTP client, query cache, API data fetching. -->

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
const qc = createQuery({ staleTime: 5_000 });

const user = await qc.query({
  key: ['users', 42],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 42 }, signal }),
});

const createUser = createMutation(({ input, signal }: { input: NewUser; signal?: AbortSignal }) =>
  api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
qc.set(['users', nextUser.id], nextUser);
qc.invalidate(['users']);
```

## Why Fetchit?

Native `fetch` is excellent but low-level. Fetchit adds base URL, typed path parameters, a query cache, and structured error handling with virtually no overhead.

```ts
// Before — raw fetch
const res = await fetch(`https://api.example.com/users/${userId}`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const user: User = await res.json();

// After — Fetchit
const api = createApi({ baseUrl: 'https://api.example.com' });
const user = await api.get<User>('/users/{id}', { params: { id: userId } });
```

| Feature               | Fetchit                                       | axios          | ky     |
| --------------------- | --------------------------------------------- | -------------- | ------ |
| Bundle size           | <PackageInfo package="fetchit" type="size" /> | ~26 kB         | ~5 kB  |
| Built on              | fetch                                         | XMLHttpRequest | fetch  |
| Type-safe path params | ✅                                            | Manual         | Manual |
| Query cache           | ✅                                            | ❌             | ❌     |
| Standalone mutations  | ✅                                            | ❌             | ❌     |
| Zero dependencies     | ✅                                            | ❌             | ❌     |

**Use Fetchit when** you want a typed fetch-based client with lightweight caching and mutation workflows without adopting a full data framework.

**Consider axios or ky** when you only need request helpers and do not need built-in query caching or mutation state.

## Features

- **Type-safe path params** — `{param}` placeholders extracted and validated at compile time
- **HTTP client** — `createApi()` with base URL, global headers, timeout, interceptors, and safe deduplication
- **Query cache** — `createQuery()` for stale-aware caching, prefix invalidation, and reactive subscriptions
- **Standalone mutations** — `createMutation()` with retry, observable state, and caller-owned `AbortSignal`
- **Request deduplication** — GET/HEAD/OPTIONS/DELETE dedupe concurrent identical calls by default
- **Interceptors** — `use()` middleware for auth tokens, logging, and request transforms
- **Retry with backoff** — configurable attempt count, exponential delay strategy, and `shouldRetry` predicate
- **Abort support** — query and mutation functions both receive an `AbortSignal`
- **Disposable** — both clients implement `[Symbol.dispose]` for `using` declarations
- **Zero dependencies** — <PackageInfo package="fetchit" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Validit](/validit/)
- [Formit](/formit/)
- [Stateit](/stateit/)
