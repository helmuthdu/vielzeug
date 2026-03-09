---
title: Fetchit — API Reference
description: Complete API reference for Fetchit HTTP client and query client.
---

# Fetchit API Reference

[[toc]]

## Overview

Fetchit provides **two separate clients** plus a **unified client** for maximum flexibility:

1. **HTTP Client** (`createHttpClient`) – Pure HTTP operations without caching
2. **Query Client** (`createQueryClient`) – Advanced query management with caching
3. **Unified Client** (`createClient`) – Combines both into a single object

Use them together or independently based on your needs.

## Core Functions

### `createHttpClient(options?)`

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
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
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
- `setHeaders(headers): void` – Update global headers
- `use(interceptor): () => void` – Add an interceptor; returns a dispose function

---

### `createQueryClient(options?)`

Creates a pure query management client. Works with any HTTP client or fetch function.

**Parameters:**

- `options?: QueryClientOptions`
  - `staleTime?: number` – Time before data is stale in ms (default: 0)
  - `gcTime?: number` – Garbage collection time in ms (default: 300000)

**Returns:** Query client instance

**Example:**

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient({ staleTime: 5000 });

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
- `prefetch<T>(options): Promise<void>` – Prefetch a query
- `getData<T>(key): T | undefined` – Get cached data
- `setData<T>(key, data | updater): void` – Set/update cached data
- `getState<T>(key): QueryState<T> | null` – Get full query state
- `invalidate(key): void` – Invalidate query (supports prefix matching)
- `subscribe<T>(key, listener): () => void` – Subscribe to query changes (returns unsubscribe)
- `clear(): void` – Clear all cached data

---

### `createClient(options?)`

Convenience factory that returns an object combining both `HttpClient` and `QueryClient` methods.

**Parameters:**

- `options?` – Merged `HttpClientOptions` and `QueryClientOptions`

**Returns:** Unified client with all HTTP and query methods

**Example:**

```ts
import { createClient } from '@vielzeug/fetchit';

const client = createClient({
  baseUrl: 'https://api.example.com',
  staleTime: 5000,
});

// HTTP methods
const user = await client.get<User>('/users/1');

// Query methods
const cachedUser = await client.query({
  key: ['users', '1'],
  fn: () => client.get<User>('/users/1'),
});

client.setHeaders({ Authorization: 'Bearer token' });
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

- `params?: Record<string, string | number | boolean | undefined>` – Path parameters (replaces `:id` or `{id}`)
- `search?: Record<string, string | number | boolean | undefined>` – Query string parameters
- `dedupe?: boolean` – Per-request deduplication override
- `signal?: AbortSignal` – For request cancellation

**Example:**

```ts
const user = await http.get<User>('/users/:id', { params: { id: '1' } });
const users = await http.get<User[]>('/users', { search: { page: 1, limit: 20 } });
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

### `setHeaders(headers)`

Update global headers. Pass `undefined` as a value to remove a header.

```ts
http.setHeaders({ Authorization: `Bearer ${token}` });
http.setHeaders({ Authorization: undefined }); // removes it
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

---

## Query Client Methods

### `query<T>(options)`

Execute a query with automatic caching, deduplication, and stale-while-revalidate semantics.

**Parameters — `QueryOptions<T>`:**

| Field | Type | Default | Description |
|---|---|---|---|
| `key` | `QueryKey` | required | Unique cache identifier |
| `fn` | `() => Promise<T>` | required | Data-fetching function |
| `staleTime` | `number` | `0` | ms before data is stale |
| `gcTime` | `number` | `300000` | ms before entry is garbage collected |
| `enabled` | `boolean` | `true` | Skip execution when `false` |
| `retry` | `number \| false` | `3` | Number of retry attempts |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries |

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
const createUser = queryClient.mutation(
  (data: NewUser) => http.post<User>('/users', { body: data }),
  { retry: false },
);

const unsubscribe = createUser.subscribe((state) => {
  if (state.isSuccess) queryClient.invalidate(['users']);
  if (state.isError) console.error(state.error);
});

const newUser = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });

unsubscribe();
```

### `prefetch<T>(options)`

Warm the cache without consuming the result. Accepts the same options as `query()`.

**Returns:** `Promise<void>`

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
queryClient.invalidate(['users']);       // all user queries (prefix match)
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

Clear all cached entries and cancel in-flight requests.

```ts
queryClient.clear();
```

---

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
  fn: () => Promise<T>;
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
  status: QueryStatus;    // 'idle' | 'pending' | 'success' | 'error'
  updatedAt: number;      // timestamp of last state change
  isLoading: boolean;
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
  timeout?: number;        // default: 30000
  dedupe?: boolean;        // default: false
  logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
};
```

---

### `QueryClientOptions`

```ts
type QueryClientOptions = {
  staleTime?: number;  // default: 0
  gcTime?: number;     // default: 300000
};
```

---

### `HttpRequestConfig`

```ts
type HttpRequestConfig = Omit<RequestInit, 'body'> & {
  body?: unknown;     // Plain objects auto-serialized to JSON; BodyInit passed through
  params?: Record<string, string | number | boolean | undefined>; // Path params (:id or {id})
  search?: Record<string, string | number | boolean | undefined>; // Query string (?key=value)
  dedupe?: boolean;   // Per-request deduplication override
};
```

**Examples:**

```ts
// Query string
await http.get('/users', { search: { role: 'admin', active: true } });
// → GET /users?role=admin&active=true

// Path parameters
await http.get('/users/:id', { params: { id: '123' } });
// → GET /users/123

// Combined
await http.get('/users/:userId/posts', {
  params: { userId: '123' },
  search: { status: 'published', limit: 10 },
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
  readonly cause?: unknown;
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

---

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

const updateUser = queryClient.mutation(
  (data: Partial<User>) => http.put<User>(`/users/${userId}`, { body: data }),
);

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
  staleTime: 5000,   // serve cached data for 5s before refetching
  gcTime: 300000,    // keep entry in memory for 5 minutes
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
