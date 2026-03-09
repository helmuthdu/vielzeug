---
title: Fetchit — API Reference
description: Complete API reference for the Fetchit HTTP client, query client, and standalone mutation.
---

## Fetchit API Reference

[[toc]]

## Core Functions

### `createApi(options?)`

Creates an HTTP client. Returns an `ApiClient`.

**Parameters — `ApiClientOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `''` | Base URL prepended to every request |
| `headers` | `Record<string, string>` | `{}` | Default headers sent with every request |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `dedupe` | `boolean` | `false` | Deduplicate non-idempotent methods; GET/HEAD/OPTIONS always dedupe regardless |
| `logger` | `(level, msg, meta?) => void` | — | Optional logger; `level` is `'info'`, `'warn'`, or `'error'` |

**Returns:** `ApiClient`

**Example:**

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 10_000,
  headers: { Authorization: 'Bearer token' },
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

const user = await api.get<User>('/users/{id}', { params: { id: 1 } });
const created = await api.post<User>('/users', { body: newUser });
```

**Methods:**

| Method | Signature | Description |
|---|---|---|
| `get` | `<T, P>(url: P, cfg?) => Promise<T>` | GET request |
| `post` | `<T, P>(url: P, cfg?) => Promise<T>` | POST request |
| `put` | `<T, P>(url: P, cfg?) => Promise<T>` | PUT request |
| `patch` | `<T, P>(url: P, cfg?) => Promise<T>` | PATCH request |
| `delete` | `<T, P>(url: P, cfg?) => Promise<T>` | DELETE request |
| `request` | `<T, P>(method, url: P, cfg?) => Promise<T>` | Custom HTTP method |
| `headers` | `(updates: Record<string, string \| undefined>) => void` | Update global headers; `undefined` value removes the header |
| `use` | `(interceptor: Interceptor) => () => void` | Add an interceptor; returns a dispose function |
| `dispose` | `() => void` | Cancel all in-flight dedup requests and remove all interceptors |
| `disposed` | `boolean` (getter) | Whether `dispose()` has been called |
| `[Symbol.dispose]` | — | Delegates to `dispose()`; enables `using` declarations |

---

### `createQuery(options?)`

Creates a query client with caching, deduplication, and reactive subscriptions. Returns a `QueryClient`.

**Parameters — `QueryClientOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `staleTime` | `number` | `0` | ms a successful entry is served from cache before a background refresh is triggered |
| `gcTime` | `number` | `300000` | ms after the last subscriber leaves before the cache entry is garbage collected |
| `retry` | `number \| false` | `1` | Default retry attempts for all queries |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries; defaults to exponential backoff (1s → 2s → … up to 30s) |

**Returns:** `QueryClient`

**Example:**

```ts
import { createQuery } from '@vielzeug/fetchit';

const qc = createQuery({ staleTime: 5_000, gcTime: 300_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});
```

**Methods:**

| Method | Signature | Description |
|---|---|---|
| `query` | `<T>(options: QueryOptions<T>) => Promise<T>` | Fetch with caching and retry |
| `prefetch` | `<T>(options) => Promise<T \| undefined>` | Warm cache; never throws |
| `get` | `<T>(key) => T \| undefined` | Read cached data |
| `set` | `<T>(key, data \| updater) => void` | Set or update cached data |
| `getState` | `<T>(key) => QueryState<T> \| null` | Full state snapshot |
| `subscribe` | `<T>(key, listener) => Unsubscribe` | Subscribe to state changes; fires immediately |
| `invalidate` | `(key) => void` | Purge entry (supports prefix matching) |
| `cancel` | `(key) => void` | Cancel in-flight request; state → `'idle'` or `'success'` |
| `clear` | `() => void` | Clear all entries; notifies active subscribers with `'idle'` |
| `dispose` | `() => void` | Cancel all in-flight requests and clear all timers |
| `disposed` | `boolean` (getter) | Whether `dispose()` has been called |
| `[Symbol.dispose]` | — | Delegates to `dispose()` |

---

### `createMutation(fn, options?)`

Creates a standalone, observable mutation handle. Returns a `Mutation<TData, TVariables>`.

**Parameters:**

- `fn: (variables: TVariables) => Promise<TData>` — The mutation function
- `options?: MutationOptions<TData, TVariables>`

**`MutationOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `retry` | `number \| false` | `false` | Retry attempts on failure |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries |
| `onSuccess` | `(data, variables) => void` | — | Called after a successful mutation |
| `onError` | `(error, variables) => void` | — | Called after a failed mutation |
| `onSettled` | `(data, error, variables) => void` | — | Always called after mutation completes |

**Returns:** `Mutation<TData, TVariables>`

```ts
{
  mutate(variables: TVariables, opts?: { signal?: AbortSignal }): Promise<TData>;
  getState(): MutationState<TData>;
  subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe;
  reset(): void;
}
```

**Example:**

```ts
import { createMutation } from '@vielzeug/fetchit';

const createUser = createMutation(
  (data: NewUser) => api.post<User>('/users', { body: data }),
  {
    onSuccess: (user) => qc.set(['users', user.id], user),
    onSettled: () => qc.invalidate(['users']),
  },
);

const unsub = createUser.subscribe((state) => {
  if (state.isPending) showSpinner();
  if (state.isSuccess) hideSpinner();
  if (state.isError) showError(state.error);
});

await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
createUser.reset();
unsub();
```

## `HttpError`

Thrown for non-2xx HTTP responses and network-level failures (timeout, abort, connection error).

```ts
class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;           // full URL of the request
  readonly method: string;        // HTTP method (uppercased)
  readonly status?: number;       // HTTP status code (absent for network errors)
  readonly data?: unknown;        // parsed response body (for non-2xx responses)
  readonly response?: Response;   // raw Response object (absent for network errors)
  readonly cause?: unknown;       // original error for network failures

  static is(err: unknown, status?: number): err is HttpError;
}
```

**`HttpError.is(err, status?)`** — type-safe narrowing helper:

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404))  console.log('Not found');
  else if (HttpError.is(err))  console.log(err.status, err.method, err.url);
}
```

## HTTP Client Config

### `HttpRequestConfig<P>`

Config accepted by all `ApiClient` request methods. `P` is the URL path literal type used to extract `{param}` placeholders.

```ts
type HttpRequestConfig<P extends string = string> =
  Omit<RequestInit, 'body' | 'method'> &
  PathConfig<P> & {
    body?: unknown;       // Plain objects → JSON; BodyInit → passed through as-is
    query?: Params;       // Query string: { page: 1, role: 'admin' } → ?page=1&role=admin
    dedupe?: boolean;     // Override client-level deduplication for this request
    timeout?: number;     // Override client-level timeout (ms)
  };
```

`PathConfig<P>` resolves to `{ params: Record<ExtractPathParams<P>, string | number | boolean> }` when `P` contains `{placeholders}`, or `{ params?: never }` otherwise.

**Body handling:**

- Plain object / array → serialized with `JSON.stringify`, `Content-Type: application/json` added
- `FormData`, `Blob`, `URLSearchParams`, `ArrayBuffer`, `ArrayBufferView`, `string` → passed through without modification

## Query Options

### `QueryOptions<T>`

```ts
type QueryOptions<T> = {
  key: QueryKey;
  fn: (ctx: QueryFnContext) => Promise<T>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};
```

## Types

### `QueryKey`

```ts
type QueryKey = readonly unknown[];
// examples: ['users'], ['users', 1], ['posts', { status: 'published' }]
```

### `QueryFnContext`

```ts
type QueryFnContext = { signal: AbortSignal };
```

The context passed to every `query()` `fn`. The `signal` is aborted when `cancel()` is called or when the query client is disposed.

### `QueryStatus`

```ts
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';
```

### `QueryState<T>`

```ts
type QueryState<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;      // Date.now() timestamp of last transition to success/error
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
};
```

### `MutationState<TData>`

Structurally identical to `QueryState<TData>`:

```ts
type MutationState<TData = unknown> = QueryState<TData>;
```

### `ApiClientOptions`

```ts
type ApiClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  dedupe?: boolean;
  logger?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
};
```

Logger levels: `'info'` for successful requests, `'warn'` for 4xx responses, `'error'` for 5xx responses and network failures.

### `QueryClientOptions`

```ts
type QueryClientOptions = {
  staleTime?: number;
  gcTime?: number;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};
```

### `MutationOptions<TData, TVariables>`

```ts
type MutationOptions<TData, TVariables> = {
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
};
```

### `Interceptor`

```ts
type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
type FetchContext = { url: string; init: RequestInit };
```

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

### `ApiClient`

```ts
type ApiClient = ReturnType<typeof createApi>;
```

### `QueryClient`

```ts
type QueryClient = ReturnType<typeof createQuery>;
```

### `Mutation<TData, TVariables>`

```ts
type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
```

## Overview

Fetchit provides **two separate clients** plus a **unified API** for maximum flexibility:

1. **HTTP Client** (`createHttp`) – Pure HTTP operations without caching
2. **Query Client** (`createQuery`) – Advanced query management with caching
3. **Unified API** (`createApi`) – Combines both into a single object

Use them together or independently based on your needs.

## Core Functions

### `createHttp(options?)`

Creates a pure HTTP client without query management. Perfect for simple HTTP requests without caching overhead.

**Parameters:**

- `options?: HttpClientOptions`
  - `baseUrl?: string` – Base URL for all requests
  - `headers?: Record<string, string>` – Default headers for all requests
  - `timeout?: number` – Request timeout in milliseconds (default: 30000)
  - `dedupe?: boolean` – Force-deduplicate non-idempotent methods (default: `false`; GET/HEAD/OPTIONS always dedupe regardless)
  - `logger?: (level, msg, meta) => void` – Optional logger function for debugging

**Returns:** HTTP client instance with REST methods

**Example:**

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: { Authorization: 'Bearer token' },
});

const user = await http.get<User>('/users/1');
const created = await http.post<User>('/users', { body: newUser });
```

**Available Methods:**

- `get<T>(url, config?): Promise<T>` – GET request
- `post<T>(url, config?): Promise<T>` – POST request
- `put<T>(url, config?): Promise<T>` – PUT request
- `patch<T>(url, config?): Promise<T>` – PATCH request
- `delete<T>(url, config?): Promise<T>` – DELETE request
- `request<T>(method, url, config?): Promise<T>` – Custom HTTP method
- `headers(headers): void` – Update global headers
- `use(interceptor): () => void` – Add an interceptor; returns a dispose function

---

### `createQuery(options?)`

Creates a pure query management client. Works with any HTTP client or fetch function.

**Parameters:**

- `options?: QueryClientOptions`
  - `staleTime?: number` – Time before data is stale in ms (default: 0)
  - `gcTime?: number` – Garbage collection time in ms (default: 300000)
  - `retry?: number | false` – Default retry attempts for queries (default: 1)
  - `retryDelay?: number | ((attempt: number) => number)` – Delay between retries

**Returns:** Query client instance

**Example:**

```ts
import { createQuery, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery({ staleTime: 5000 });

const user = await queryClient.query({
  key: ['users', 1],
  fn: () => http.get('/users/1'),
});

// Or with native fetch
const data = await queryClient.query({
  key: ['data'],
  fn: () => fetch('/data').then((r) => r.json()),
});
```

**Available Methods:**

**Core Methods:**

- `query<T>(options): Promise<T | undefined>` – Execute a query with caching
- `mutation<TData, TVariables>(fn, opts?): MutationHandle` – Create a mutation factory
- `prefetch<T>(options): Promise<T | undefined>` – Prefetch a query (never throws)
- `getData<T>(key): T | undefined` – Get cached data
- `setData<T>(key, data | updater): void` – Set/update cached data
- `getState<T>(key): QueryState<T> | null` – Get full query state
- `invalidate(key): void` – Invalidate query (supports prefix matching)
- `subscribe<T>(key, listener): () => void` – Subscribe to query changes (returns unsubscribe)
- `clear(): void` – Clear all cached data
- `cancel(key): void` – Cancel an in-flight query; transitions state to `idle` or `success` if data exists

---

### `createApi(options?)`

Convenience factory that returns an object combining both `HttpClient` and `QueryClient` methods.

**Parameters:**

- `options?` – Merged `HttpClientOptions` and `QueryClientOptions`

**Returns:** Unified API with all HTTP and query methods

**Example:**

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  staleTime: 5000,
});

// HTTP methods
const user = await api.get<User>('/users/1');

// Query methods
const cachedUser = await api.query({
  key: ['users', '1'],
  fn: () => client.get<User>('/users/1'),
});

client.headers({ Authorization: 'Bearer token' });
client.invalidate(['users']);
```

## Type-Safe Query Keys

While there's no built-in helper, you can create type-safe query keys using TypeScript's `as const`:

**Example:**

```ts
// Define query keys manually
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
  posts: {
    all: () => ['posts'] as const,
    detail: (id: number) => ['posts', id] as const,
  },
} as const;

// Type-safe usage – autocomplete works!
await queryClient.query({
  key: queryKeys.users.detail('123'),
  fn: () => http.get('/users/123'),
});

// Invalidate with type safety
queryClient.invalidate(queryKeys.users.all());
```

## HTTP Client Methods

All HTTP client methods return `Promise<T>` — the deserialized response body directly.

> **Smart Deduplication:** GET, HEAD, and OPTIONS requests always deduplicate concurrent identical calls. POST/PUT/PATCH/DELETE only deduplicate when `dedupe: true` is set.

### `get<T>(url, config?)`

**Config Options:**

- `params?: Record<string, string | number | boolean | undefined>` – Path parameters (replaces `{id}` placeholders)
- `query?: Record<string, string | number | boolean | undefined>` – Query string parameters
- `timeout?: number` – Per-request timeout override (ms)
- `dedupe?: boolean` – Per-request deduplication override
- `signal?: AbortSignal` – For request cancellation

**Example:**

```ts
const user = await http.get<User>('/users/{id}', { params: { id: '1' } });
const users = await http.get<User[]>('/users', { query: { page: 1, limit: 20 } });
```

### `post<T>(url, config?)` / `put<T>` / `patch<T>`

```ts
const created = await http.post<User>('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});
```

### `delete<T>(url, config?)`

```ts
await http.delete('/users/1');
```

### `request<T>(method, url, config?)`

Makes a request with a custom HTTP method.

```ts
const info = await http.request<Info>('OPTIONS', '/users');
```

### `headers(headers)`

Update global headers. Pass `undefined` as a value to remove a header.

```ts
http.headers({ Authorization: `Bearer ${token}` });
http.headers({ Authorization: undefined }); // removes it
```

### `use(interceptor)`

Add middleware to intercept every request. Returns a dispose function.

```ts
const dispose = http.use(async (ctx, next) => {
  ctx.init.headers = { ...(ctx.init.headers as Record<string, string>), 'X-Request-Id': crypto.randomUUID() };
  return next(ctx);
});

dispose(); // remove interceptor
```

## Query Client Methods

### `query<T>(options)`

Execute a query with automatic caching, deduplication, and stale-while-revalidate semantics.

**Parameters — `QueryOptions<T>`:**

| Field        | Type                            | Default     | Description                          |
| ------------ | ------------------------------- | ----------- | ------------------------------------ |
| `key`        | `QueryKey`                      | required    | Unique cache identifier              |
| `fn`         | `(signal: AbortSignal) => Promise<T>` | required | Data-fetching function; receives an `AbortSignal` |
| `staleTime`  | `number`                        | `0`         | ms before data is stale              |
| `gcTime`     | `number`                        | `300000`    | ms before entry is garbage collected |
| `enabled`    | `boolean`                       | `true`      | Skip execution when `false`          |
| `retry`      | `number \| false`               | `1`         | Number of retry attempts             |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries                |

**Returns:** `Promise<T | undefined>`

**Example:**

```ts
const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
  staleTime: 5000,
  retry: 3,
});
```

### `mutation<TData, TVariables>(fn, opts?)`

Creates a **mutation factory** — a reusable handle to execute and observe a mutation.

**Parameters:**

- `fn: (variables: TVariables) => Promise<TData>` – The mutation function
- `opts?`
  - `retry?: number | false` – Retry attempts (default: `false`)
  - `retryDelay?: number | ((attempt: number) => number)`
  - `onSuccess?: (data: TData, variables: TVariables) => void` – Called on success
  - `onError?: (error: Error, variables: TVariables) => void` – Called on error
  - `onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void` – Always called

**Returns:**

```ts
{
  mutate(variables: TVariables): Promise<TData>;
  subscribe(listener: (state: MutationState<TData>) => void): () => void;
  getState(): MutationState<TData>;
  reset(): void;
}
```

**Example:**

```ts
const createUser = queryClient.mutation((data: NewUser) => http.post<User>('/users', { body: data }), { retry: false });

const unsubscribe = createUser.subscribe((state) => {
  if (state.isSuccess) queryClient.invalidate(['users']);
  if (state.isError) console.error(state.error);
});

const newUser = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });

unsubscribe();
```

### `prefetch<T>(options)`

Warm the cache without consuming the result. Accepts the same options as `query()`.

**Returns:** `Promise<T | undefined>`

```ts
await queryClient.prefetch({
  key: ['users', '2'],
  fn: () => http.get('/users/2'),
});
```

### `getData<T>(key)`

Get cached data without triggering a fetch. Returns `T | undefined`.

```ts
const user = queryClient.getData<User>(['users', '1']);
```

### `setData<T>(key, data)`

Manually set or update cache data. Accepts a value or an updater function.

```ts
queryClient.setData(['users', '1'], { id: '1', name: 'Alice' });
queryClient.setData<User>(['users', '1'], (old) => ({ ...old, name: 'Alice Updated' }));
```

### `getState<T>(key)`

Get the full `QueryState` for a key. Returns `QueryState<T> | null`.

```ts
const state = queryClient.getState<User>(['users', '1']);
if (state) {
  console.log(state.status, state.data, state.updatedAt);
}
```

### `invalidate(key)`

Remove a key or all keys with a matching prefix from the cache.

- Exact match: `['users', '1']` removes only that entry
- Prefix match: `['users']` removes all entries starting with `'users'`

```ts
queryClient.invalidate(['users', '1']); // exact
queryClient.invalidate(['users']); // all user queries (prefix match)
```

### `subscribe<T>(key, listener)`

Subscribe to `QueryState` changes. Returns an unsubscribe function.

```ts
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log(state.status, state.data, state.error);
});

unsubscribe();
```

### `clear()`

Clear all cached entries and notify active subscribers with idle state.

```ts
queryClient.clear();
```

### `cancel(key)`

Cancel an in-flight query. If data is already present the status transitions to `success`; otherwise to `idle`. Schedules GC if data exists.

```ts
queryClient.cancel(['users', userId]);
```

## Types

### `QueryKey`

```ts
type QueryKey = readonly unknown[];
```

Examples: `['users']`, `['users', 1]`, `['posts', { status: 'published' }]`

---

### `QueryOptions<T>`

```ts
type QueryOptions<T> = {
  key: QueryKey;
  fn: (signal: AbortSignal) => Promise<T>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};
```

---

### `QueryState<T>`

```ts
type QueryState<T> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus; // 'idle' | 'pending' | 'success' | 'error'
  updatedAt: number; // timestamp of last state change
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
};
```

---

### `MutationState<TData>`

Alias for `QueryState<TData>` — same shape, used for mutation observability.

```ts
type MutationState<TData> = QueryState<TData>;
```

---

### `QueryStatus`

```ts
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';
```

---

### `HttpClientOptions`

```ts
type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number; // default: 30000
  dedupe?: boolean; // default: false
  logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
};
```

---

### `QueryClientOptions`

```ts
type QueryClientOptions = {
  staleTime?: number; // default: 0
  gcTime?: number; // default: 300000
  retry?: number | false; // default: 1
  retryDelay?: number | ((attempt: number) => number);
};
```

---

### `HttpRequestConfig`

```ts
type HttpRequestConfig = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown; // Plain objects auto-serialized to JSON; BodyInit passed through
  params?: Record<string, string | number | boolean | undefined>; // Path params ({id})
  query?: Record<string, string | number | boolean | undefined>; // Query string (?key=value)
  timeout?: number; // Per-request timeout override (ms)
  dedupe?: boolean; // Per-request deduplication override
};
```

**Examples:**

```ts
// Query string
await http.get('/users', { query: { role: 'admin', active: true } });
// → GET /users?role=admin&active=true

// Path parameters
await http.get('/users/{id}', { params: { id: '123' } });
// → GET /users/123

// Combined
await http.get('/users/{userId}/posts', {
  params: { userId: '123' },
  query: { status: 'published', limit: 10 },
});
// → GET /users/123/posts?status=published&limit=10
```

---

### `HttpError`

Thrown for non-2xx responses and network-level errors.

```ts
class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly response?: Response;
  readonly cause?: unknown;
  static is(err: unknown, status?: number): err is HttpError;
}
```

**Example:**

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await http.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} → ${error.status}`);
  }
}
```

---

### `Interceptor`

```ts
type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
```

### `FetchContext`

```ts
type FetchContext = { url: string; init: RequestInit };
```

## Advanced Usage

### Type-Safe Query Keys

```ts
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
} as const;

await queryClient.query({
  key: queryKeys.users.detail('123'),
  fn: () => http.get('/users/123'),
});

queryClient.invalidate(queryKeys.users.all());
```

### Optimistic Updates

```ts
queryClient.setData<User>(['users', userId], (old) => ({ ...old, name: 'New Name' }));

const updateUser = queryClient.mutation((data: Partial<User>) => http.put<User>(`/users/${userId}`, { body: data }));

try {
  await updateUser.mutate({ name: 'New Name' });
  queryClient.invalidate(['users', userId]);
} catch {
  // Rollback
  queryClient.invalidate(['users', userId]);
}
```

### Stale-While-Revalidate Pattern

```ts
const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
  staleTime: 5000, // serve cached data for 5s before refetching
  gcTime: 300000, // keep entry in memory for 5 minutes
});
```

### Custom Retry Strategies

```ts
// Exponential backoff
await queryClient.query({
  key: ['users'],
  fn: () => http.get<User[]>('/users'),
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});

// Fixed delay
await queryClient.query({
  key: ['users'],
  fn: () => http.get<User[]>('/users'),
  retry: 5,
  retryDelay: 2000,
});

// Disable retries
await queryClient.query({
  key: ['users'],
  fn: () => http.get<User[]>('/users'),
  retry: false,
});
```

### Auth Interceptor

```ts
const dispose = http.use(async (ctx, next) => {
  const token = await getAccessToken();
  ctx.init.headers = {
    ...(ctx.init.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };
  return next(ctx);
});
```
