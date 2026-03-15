# @vielzeug/fetchit

> Lightweight, type-safe HTTP client with query caching, request deduplication, and standalone mutations

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fetchit** provides three independent primitives built on the native `fetch` API: an HTTP client (`createApi`), a query cache (`createQuery`), and standalone mutations (`createMutation`). Use them together or independently.

## Installation

```sh
pnpm add @vielzeug/fetchit
# npm install @vielzeug/fetchit
# yarn add @vielzeug/fetchit
```

## Quick Start

```typescript
import { createApi, createQuery, createMutation } from '@vielzeug/fetchit';

const api = createApi({ baseUrl: 'https://api.example.com' });

// Simple request
const users = await api.get<User[]>('/users');

// Cached query with lifecycle callbacks
const qc = createQuery({ staleTime: 5_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  onSuccess: (data) => console.log(`Loaded ${data.name}`),
  onError: (err) => console.error(err.message),
});

// Standalone mutation with lifecycle callbacks
const createUser = createMutation((data: NewUser) => api.post<User>('/users', { body: data }), {
  onSuccess: () => qc.invalidate(['users']),
});
await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

## Features

- ✅ **Type-safe path params** — `{param}` placeholders inferred at compile time
- ✅ **Smart caching** — stale-while-revalidate with configurable `staleTime` and `gcTime`
- ✅ **Query callbacks** — `onSuccess`, `onError`, `onSettled` per-call callbacks on `query()`
- ✅ **Request deduplication** — GET/HEAD/OPTIONS always deduplicate; other methods opt-in
- ✅ **Interceptors** — `use()` middleware for auth, logging, and transforms
- ✅ **Retry with backoff** — configurable retry count, exponential delay, and `shouldRetry` predicate
- ✅ **Abort support** — `QueryFnContext` carries an `AbortSignal` to cancel in-flight requests
- ✅ **Standalone mutations** — `createMutation()` with `subscribe()`, `getState()`, `cancel()`, and `reset()`
- ✅ **Reactive subscriptions** — `subscribe(key, listener)` for live query state updates
- ✅ **Disposable** — both clients implement `[Symbol.dispose]` for `using` declarations
- ✅ **Zero dependencies** — built on the native `fetch` API

## Usage

### HTTP Client

```typescript
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 10_000,
  headers: { Authorization: 'Bearer token' },
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

// Type-safe path parameters — TypeScript errors if params are missing or wrong
const user = await api.get<User>('/users/{id}', { params: { id: 123 } });

// Query string
const page = await api.get<User[]>('/users', { query: { page: 1, limit: 20 } });

// Body (serialized to JSON automatically)
const created = await api.post<User>('/users', { body: { name: 'Alice' } });

// Update headers at runtime
api.headers({ Authorization: 'Bearer new-token' });

// Interceptors
const dispose = api.use(async (ctx, next) => {
  ctx.init.headers = { ...(ctx.init.headers as object), 'X-Request-Id': crypto.randomUUID() };
  return next(ctx);
});
dispose(); // remove interceptor
```

### Query Client

```typescript
import { createQuery } from '@vielzeug/fetchit';

const qc = createQuery({ staleTime: 5_000, gcTime: 300_000 });

// fn receives a QueryFnContext with key and AbortSignal
const data = await qc.query({
  key: ['users', userId],
  fn: ({ key, signal }) => api.get<User[]>('/users', { signal }),
  retry: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
  onSuccess: (users) => console.log(`Loaded ${users.length} users`),
  onError: (err) => console.error('Failed:', err.message),
});

// Read / seed cache manually
qc.set(['users', 1], updatedUser);
const cached = qc.get<User>(['users', 1]);

// Prefix invalidation — invalidates ['users', 1], ['users', 2], etc.
qc.invalidate(['users']);

// Subscribe to live state changes
const unsub = qc.subscribe<User>(['users', 1], (state) => {
  console.log(state.status, state.data, state.error);
});
unsub(); // stop listening
```

### Standalone Mutation

```typescript
import { createMutation } from '@vielzeug/fetchit';

const updateUser = createMutation((patch: Partial<User>) => api.put<User>(`/users/${userId}`, { body: patch }), {
  onSuccess: (data, variables) => qc.set(['users', userId], data),
  onError: (error) => console.error(error),
  onSettled: () => qc.invalidate(['users']),
});

await updateUser.mutate({ name: 'Alice' });

// Cancel in-flight mutation (e.g. on component unmount)
updateUser.cancel();

// Reactive state
const unsub = updateUser.subscribe((state) => {
  console.log(state.isPending, state.isSuccess, state.isError);
});
updateUser.reset(); // back to idle
```

### Error Handling

```typescript
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/not-found');
} catch (err) {
  if (HttpError.is(err, 404)) {
    console.log('Not found:', err.url);
  } else if (HttpError.is(err)) {
    console.log(err.status, err.method, err.url, err.data);
  }
}
```

## API

### `createApi(options?)`

| Option    | Type                          | Default | Description                                                         |
| --------- | ----------------------------- | ------- | ------------------------------------------------------------------- |
| `baseUrl` | `string`                      | `''`    | Base URL prepended to every request                                 |
| `headers` | `Record<string, string>`      | `{}`    | Default headers for all requests                                    |
| `timeout` | `number`                      | `30000` | Request timeout in ms                                               |
| `dedupe`  | `boolean`                     | `false` | Deduplicate non-idempotent methods (GET/HEAD/OPTIONS always dedupe) |
| `logger`  | `(level, msg, meta?) => void` | —       | Optional request logger (`'info'`, `'warn'`, `'error'`)             |

Returns: `{ get, post, put, patch, delete, request, headers, use, dispose, disposed }`

### `createQuery(options?)`

| Option        | Type                            | Default     | Description                                     |
| ------------- | ------------------------------- | ----------- | ----------------------------------------------- |
| `staleTime`   | `number`                        | `0`         | ms before cached data is considered stale       |
| `gcTime`      | `number`                        | `300000`    | ms before unused cache entries are collected    |
| `retry`       | `number \| false`               | `1`         | Default retry attempts for failed queries       |
| `retryDelay`  | `number \| (attempt) => number` | exponential | Delay between retries                           |
| `shouldRetry` | `(error, attempt) => boolean`   | —           | Return `false` to skip retrying specific errors |

Returns: `{ query, prefetch, get, set, getState, subscribe, invalidate, cancel, clear, dispose, disposed }`

### `createMutation(fn, options?)`

| Option        | Type                               | Default     | Description                                     |
| ------------- | ---------------------------------- | ----------- | ----------------------------------------------- |
| `retry`       | `number \| false`                  | `false`     | Retry attempts on failure                       |
| `retryDelay`  | `number \| (attempt) => number`    | exponential | Delay between retries                           |
| `shouldRetry` | `(error, attempt) => boolean`      | —           | Return `false` to skip retrying specific errors |
| `onSuccess`   | `(data, variables) => void`        | —           | Called on successful mutation                   |
| `onError`     | `(error, variables) => void`       | —           | Called on failed mutation                       |
| `onSettled`   | `(data, error, variables) => void` | —           | Always called after mutation                    |

Returns: `{ mutate, cancel, getState, subscribe, reset }`

## Documentation

Full docs at **[vielzeug.dev/fetchit](https://vielzeug.dev/fetchit)**

|                                                   |                                                    |
| ------------------------------------------------- | -------------------------------------------------- |
| [Usage Guide](https://vielzeug.dev/fetchit/usage) | HTTP client, query client, mutations, interceptors |
| [API Reference](https://vielzeug.dev/fetchit/api) | Complete type signatures                           |
| [Examples](https://vielzeug.dev/fetchit/examples) | Real-world data-fetching patterns                  |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
