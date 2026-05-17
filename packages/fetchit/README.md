# @vielzeug/fetchit

> Type-safe HTTP client, cache, and lean mutation helper built on native `fetch`.

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/fetchit` keeps the surface small:

- `createApi` for typed HTTP requests
- `createQuery` for cached async reads with subscriptions
- `createMutation` for tracked writes with built-in cancellation
- `prefetch` on query clients for cache warming

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/fetchit` | `createApi`, `createQuery`, `createMutation`, `HttpError`, and types |

## Installation

```sh
pnpm add @vielzeug/fetchit
# npm install @vielzeug/fetchit
# yarn add @vielzeug/fetchit
```

## Quick Start

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';

type User = { id: number; name: string };
type NewUser = { name: string };

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ attempts: 3, staleTime: 5_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

const createUser = createMutation((input: NewUser, signal: AbortSignal) =>
  api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
qc.set(['users', nextUser.id], nextUser);
qc.invalidate(['users']);
```

## Features

- Type-safe path params from `'/path/{id}'` patterns
- Automatic read dedupe for idempotent requests
- Explicit write dedupe with `dedupeKey` when you really need it
- Query cache with `staleTime`, `gcTime`, subscriptions, invalidation, cancellation, and retry controls
- `enabled` and `initialData` on every `query()` call
- Per-subscriber `placeholderData` via `subscribe()` options
- `select` on `subscribe()` — transform data and skip redundant notifications
- `refetchOnFocus` and `refetchOnReconnect` on the query client
- Query cache prefetching for route/page warm-up flows
- Retry controls with backoff hooks
- Mutation handlers use a flat signature: `(input, signal)`
- Mutation lifecycle callbacks: `onSuccess`, `onError`, `onSettled`
- Built-in mutation cancellation via `await mutation.cancel()`
- `api.cancelAll()` aborts all in-flight requests without disposing the client
- `HttpError.headers` shorthand for `err.response?.headers`
- Optional `fetch` injection for tests/runtime adapters
- Strict timeout semantics (`> 0` or `Infinity`)
- Interceptors for auth, logging, and request transforms
- Rich HTTP errors via `HttpError`
- `[Symbol.dispose]` support on API and query clients

## Core API

- `createApi(options?) => ApiClient`
- `createQuery(options?) => QueryClient`
- `createMutation(fn, options?) => Mutation`
- `HttpError`

```ts
await qc.prefetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 10_000,
});
```

## Documentation

- [Overview](https://vielzeug.dev/fetchit/)
- [Usage Guide](https://vielzeug.dev/fetchit/usage)
- [API Reference](https://vielzeug.dev/fetchit/api)
- [Examples](https://vielzeug.dev/fetchit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
