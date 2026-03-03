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

const user = await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => http.get<User>('/users/1'),
});

// Mutation with cache invalidation
await queryClient.mutate(
  {
    mutationFn: (data: NewUser) => http.post<User>('/users', { body: data }),
    onSuccess: () => queryClient.invalidate(['users']),
  },
  { name: 'Alice', email: 'alice@example.com' },
);
```

## Features

- ✅ **Smart caching** — stale-while-revalidate with configurable `staleTime` and `gcTime`
- ✅ **Request deduplication** — concurrent identical requests share one in-flight fetch
- ✅ **Retry with backoff** — configurable retry count and delay strategy
- ✅ **Abort support** — pass an `AbortSignal` to cancel in-flight requests
- ✅ **Mutations** — `onSuccess`, `onError`, `onSettled` callbacks
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
const page = await http.get<User[]>('/users', { query: { page: 1, limit: 20 } });

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
const data = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get(`/users/${userId}`),
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
| `dedupe` | `boolean` | `true` | Deduplicate concurrent identical requests |

Returns: `{ get, post, put, patch, delete, request, setHeaders }`

### `createQueryClient(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `staleTime` | `number` | `0` | ms before cached data is stale |
| `gcTime` | `number` | `300000` | ms before unused cache is collected |

Returns: `{ fetch, prefetch, mutate, invalidate, setData, getData, getState, subscribe, clear }`

## Documentation

Full docs at **[vielzeug.dev/fetchit](https://vielzeug.dev/fetchit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/fetchit/usage) | HTTP client, query client, caching patterns |
| [API Reference](https://vielzeug.dev/fetchit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/fetchit/examples) | Real-world data-fetching patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
