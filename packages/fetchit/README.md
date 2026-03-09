# @vielzeug/fetchit

> Lightweight HTTP client with smart caching, request deduplication, and query management

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fetchit** is a type-safe HTTP client pair: a simple `HttpClient` for everyday requests and a `QueryClient` for cache-backed data fetching with stale-while-revalidate semantics.

## Installation

```sh
pnpm add @vielzeug/fetchit
# npm install @vielzeug/fetchit
# yarn add @vielzeug/fetchit
```

## Quick Start

```typescript
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Simple request
const users = await http.get<User[]>('/users');

// Cached query — second call returns from cache
const queryClient = createQueryClient({ staleTime: 5000 });

const user = await queryClient.query({
  key: ['users', 1],
  fn: () => http.get<User>('/users/1'),
});

// Mutation with cache invalidation
const createUser = queryClient.mutation(
  (data: NewUser) => http.post<User>('/users', { body: data }),
);
await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
queryClient.invalidate(['users']);
```

## Features

- ✅ **Smart caching** — stale-while-revalidate with configurable `staleTime` and `gcTime`
- ✅ **Request deduplication** — GET/HEAD/OPTIONS always deduplicate; other methods opt-in
- ✅ **Interceptors** — `use()` middleware for auth, logging, and transforms
- ✅ **Retry with backoff** — configurable retry count and delay strategy
- ✅ **Abort support** — pass an `AbortSignal` to cancel in-flight requests
- ✅ **Mutations** — factory pattern with `subscribe()`, `getState()`, and `reset()`
- ✅ **Subscriptions** — reactive `subscribe()` for query state changes
- ✅ **Type-safe** — full TypeScript inference throughout

## Usage

### HTTP Client

```typescript
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10_000,
  headers: { Authorization: 'Bearer token' },
});

// Path parameters
const user = await http.get<User>('/users/:id', { params: { id: '123' } });

// Query string
const page = await http.get<User[]>('/users', { search: { page: 1, limit: 20 } });

// Body
const created = await http.post<User>('/users', { body: { name: 'Alice' } });

// Update headers at runtime
http.setHeaders({ Authorization: 'Bearer new-token' });
```

### Query Client

```typescript
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient({ staleTime: 5_000, gcTime: 300_000 });

// Fetch with retry
const data = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get(`/users/${userId}`),
  retry: 3,
});

// Seed / read cache manually
queryClient.setData(['users', 1], updatedUser);
const cached = queryClient.getData<User>(['users', 1]);

// Prefix invalidation
queryClient.invalidate(['users']);

// Subscribe to state changes
const unsub = queryClient.subscribe(['users', 1], (state) => {
  console.log(state.status, state.data, state.error);
});

// Create a mutation factory
const updateUser = queryClient.mutation(
  (data: Partial<User>) => http.put<User>(`/users/${userId}`, { body: data }),
);
await updateUser.mutate({ name: 'Alice' });
```

### Error Handling

```typescript
import { HttpError } from '@vielzeug/fetchit';

try {
  await http.get('/not-found');
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status, err.method, err.url);
  }
}
```

## API

### `createHttpClient(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `''` | Base URL prepended to every request |
| `headers` | `Record<string, string>` | `{}` | Default headers |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `dedupe` | `boolean` | `false` | Force-dedupe non-idempotent methods (GET/HEAD/OPTIONS always dedupe) |

Returns: `{ get, post, put, patch, delete, request, setHeaders, use }`

### `createQueryClient(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `staleTime` | `number` | `0` | ms before cached data is stale |
| `gcTime` | `number` | `300000` | ms before unused cache is collected |

Returns: `{ query, mutation, prefetch, invalidate, setData, getData, getState, subscribe, clear }`

## Documentation

Full docs at **[vielzeug.dev/fetchit](https://vielzeug.dev/fetchit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/fetchit/usage) | HTTP client, query client, caching patterns |
| [API Reference](https://vielzeug.dev/fetchit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/fetchit/examples) | Real-world data-fetching patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
