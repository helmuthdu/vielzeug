# @vielzeug/fetchit

> Type-safe fetch primitives: HTTP client, query cache, and standalone mutations.

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/fetchit` provides three composable primitives built on native `fetch`:

- `createApi` for typed HTTP requests
- `createQuery` for cached async queries with subscriptions
- `createMutation` for observable write operations

## Installation

```sh
pnpm add @vielzeug/fetchit
# npm install @vielzeug/fetchit
# yarn add @vielzeug/fetchit
```

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@vielzeug/fetchit` | Main API (`createApi`, `createQuery`, `createMutation`, `HttpError`, types) |
| `@vielzeug/fetchit/core` | Core bundle entry |

## Quick Start

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';

type User = { id: number; name: string };
type NewUser = { name: string };

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

const createUser = createMutation((payload: NewUser) => api.post<User>('/users', { body: payload }), {
  onSuccess: () => qc.invalidate(['users']),
});

await createUser.mutate({ name: 'Alice' });
```

## Features

- Type-safe path params from `'/path/{id}'` patterns
- Request dedupe (idempotent methods by default, others opt-in)
- Query cache with stale/fresh and GC control (`staleTime`, `gcTime`)
- Query callbacks (`onSuccess`, `onError`, `onSettled`) per triggering call
- Observable mutation state (`subscribe`, `getState`, `cancel`, `reset`)
- Retry controls (`retry`, `retryDelay`, `shouldRetry`)
- Interceptors for request/response middleware
- Rich HTTP errors via `HttpError`
- `[Symbol.dispose]` support on API and query clients

## API At a Glance

- `createApi(options?) => ApiClient`
- `createQuery(options?) => QueryClient`
- `createMutation(fn, options?) => Mutation`
- `HttpError`
- `serializeKey` (stable query-key serializer utility)

## Docs

- [Overview](https://vielzeug.dev/fetchit/)
- [Usage Guide](https://vielzeug.dev/fetchit/usage)
- [API Reference](https://vielzeug.dev/fetchit/api)
- [Examples](https://vielzeug.dev/fetchit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
