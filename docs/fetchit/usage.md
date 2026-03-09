---
title: Fetchit — Usage Guide
description: HTTP client, query client, standalone mutations, interceptors, and error handling for Fetchit.
---

## Fetchit Usage Guide

::: tip New to Fetchit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

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

| Feature              | Fetchit                                       | axios          | ky     |
| -------------------- | --------------------------------------------- | -------------- | ------ |
| Bundle size          | <PackageInfo package="fetchit" type="size" /> | ~30 kB         | ~5 kB  |
| Built on             | fetch                                         | XMLHttpRequest | fetch  |
| Type-safe path params | ✅                                           | Manual         | Manual |
| Query cache          | ✅                                            | ❌             | ❌     |
| Standalone mutations | ✅                                            | ❌             | ❌     |
| Zero dependencies    | ✅                                            | ❌             | ❌     |

## Import

```ts
import { createApi, createQuery, createMutation, HttpError } from '@vielzeug/fetchit';
// Types
import type {
  ApiClient,
  QueryClient,
  Mutation,
  QueryState,
  MutationState,
  QueryStatus,
  QueryKey,
  QueryFnContext,
  QueryOptions,
  HttpRequestConfig,
  ApiClientOptions,
  QueryClientOptions,
  MutationOptions,
  Interceptor,
} from '@vielzeug/fetchit';
```

## HTTP Client

`createApi()` returns a thin HTTP client built on the native `fetch` API.

### Creating a Client

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 30_000,           // default: 30 000 ms
  headers: { Authorization: 'Bearer token' },
  dedupe: false,             // default: false — GET/HEAD/OPTIONS always dedupe regardless
  logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta),
});
```

### HTTP Methods

All methods return `Promise<T>` with the deserialized response body.

```ts
// GET
const users = await api.get<User[]>('/users');

// POST — plain object body is serialized to JSON automatically
const created = await api.post<User>('/users', { body: { name: 'Alice' } });

// PUT / PATCH / DELETE
const updated = await api.put<User>('/users/1', { body: { name: 'Alice Smith' } });
const patched  = await api.patch<User>('/users/1', { body: { email: 'new@example.com' } });
await api.delete('/users/1');

// Custom method
const info = await api.request<Info>('OPTIONS', '/users');
```

### Type-Safe Path Parameters

`{param}` placeholders are extracted at compile time — TypeScript errors if a required param is missing or misspelled.

```ts
// Single param
const user = await api.get<User>('/users/{id}', { params: { id: 42 } });
// → GET /users/42

// Multiple params — TypeScript enforces all are provided
const comment = await api.get<Comment>('/posts/{postId}/comments/{commentId}', {
  params: { postId: 1, postId: 1, commentId: 99 },
});
// → GET /posts/1/comments/99
```

### Query String Parameters

```ts
const page = await api.get<User[]>('/users', {
  query: { role: 'admin', page: 1, limit: 20 },
});
// → GET /users?role=admin&page=1&limit=20

// Combining path params and query string
const posts = await api.get<Post[]>('/users/{id}/posts', {
  params: { id: 42 },
  query: { status: 'published', limit: 10 },
});
// → GET /users/42/posts?status=published&limit=10
```

### Managing Headers

```ts
// Update at runtime — settles on all subsequent requests
api.headers({ Authorization: `Bearer ${newToken}` });

// Remove a header by setting it to undefined
api.headers({ Authorization: undefined });
```

### Request Deduplication

GET, HEAD, and OPTIONS requests are **always** deduplicated — concurrent identical in-flight calls share one network request.

```ts
// Only ONE network call is made
const [a, b, c] = await Promise.all([
  api.get('/users/1'),
  api.get('/users/1'),
  api.get('/users/1'),
]);
console.log(a === b); // true — same promise

// To deduplicate POST/PUT/PATCH/DELETE, opt in per-client or per-request
const api2 = createApi({ baseUrl: '...', dedupe: true });
const result = await api.post('/data', { body: payload, dedupe: true });
```

### Per-Request Options

All standard `RequestInit` options are supported alongside Fetchit extensions:

```ts
const data = await api.get<Data>('/protected', {
  headers: { 'X-Custom': 'value' },  // per-request headers merged over globals
  signal: controller.signal,         // AbortSignal for cancellation
  timeout: 5_000,                    // override client-level timeout
  dedupe: false,                     // disable deduplication for this request
});
```

## Interceptors

`use(interceptor)` adds middleware that wraps every request. Returns a dispose function. Interceptors are called in registration order.

```ts
// Auth — inject a fresh token before each request
const removeAuth = api.use(async (ctx, next) => {
  const token = await getAccessToken();
  ctx.init.headers = { ...(ctx.init.headers as Record<string, string>), Authorization: `Bearer ${token}` };
  return next(ctx);
});

// Logging
const removeLog = api.use(async (ctx, next) => {
  const start = Date.now();
  const res = await next(ctx);
  console.log(`${ctx.init.method} ${ctx.url} → ${res.status} (${Date.now() - start}ms)`);
  return res;
});

// Remove interceptors when no longer needed
removeAuth();
removeLog();
```

An interceptor can short-circuit the chain by returning a `Response` without calling `next(ctx)`.

## Query Client

`createQuery()` provides stale-while-revalidate caching, request deduplication, prefix invalidation, and reactive subscriptions for any async data source.

### Creating a Query Client

```ts
import { createQuery } from '@vielzeug/fetchit';

const qc = createQuery({
  staleTime: 0,        // default: 0 — data is immediately stale
  gcTime: 300_000,     // default: 5 min — unused entries are GC'd after this
  retry: 1,            // default: 1 retry attempt
  retryDelay: undefined, // default: exponential backoff (1s → 2s → 4s → … up to 30s)
});
```

### `query(options)`

Fetches data with automatic caching, deduplication, and retry. The `fn` receives a `QueryFnContext` carrying an `AbortSignal`.

```ts
const user = await qc.query({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
  staleTime: 5_000,
  retry: 3,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `QueryKey` | required | Cache identifier; serialized with stable key ordering |
| `fn` | `(ctx: QueryFnContext) => Promise<T>` | required | Data-fetching function; receives `{ signal }` |
| `staleTime` | `number` | `0` | ms served from cache before a background refresh |
| `gcTime` | `number` | `300000` | ms after last observer is removed before the entry is GC'd |
| `enabled` | `boolean` | `true` | Pass `false` to skip execution and return cached data |
| `retry` | `number \| false` | `1` | Number of retry attempts (`false` = no retries) |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries |

::: tip Retry semantics
`retry: 3` means **3 retries** (4 total attempts: 1 initial + 3 retries). `retry: false` means 1 attempt only.
:::

### `prefetch(options)`

Warms the cache without throwing. Accepts the same options as `query()`.

```ts
// Fire and forget — good for route transition pre-loading
await qc.prefetch({ key: ['users', 2], fn: ({ signal }) => api.get('/users/2', { signal }) });
```

### Cache Access

```ts
// Read cached data without triggering a fetch
const cached = qc.get<User>(['users', 1]);

// Set or update cache data directly
qc.set(['users', 1], { id: 1, name: 'Alice' });
qc.set<User[]>(['users'], (old = []) => [...old, newUser]);  // updater function

// Full state snapshot
const state = qc.getState<User>(['users', 1]);
// → { data, error, status, updatedAt, isPending, isSuccess, isError, isIdle }
```

### `subscribe(key, listener)`

Subscribes to live `QueryState` updates for a key. Fires immediately with the current state. Returns an unsubscribe function.

```ts
const unsub = qc.subscribe<User>(['users', 1], (state) => {
  console.log(state.status);   // 'idle' | 'pending' | 'success' | 'error'
  console.log(state.data);     // T | undefined
  console.log(state.error);    // Error | null
  console.log(state.isPending, state.isSuccess, state.isError, state.isIdle);
});

unsub(); // stop listening
```

Subscribing keeps the cache entry alive (cancels any pending GC timer). The entry is removed when the last subscriber leaves and the status is `'idle'`.

### `invalidate(key)`

Cancels any in-flight request and removes the entry — or resets it to `'idle'` if it has active subscribers. Supports **prefix matching**: invalidating `['users']` purges `['users', 1]`, `['users', 2]`, etc.

```ts
qc.invalidate(['users', 1]);   // exact match
qc.invalidate(['users']);      // all keys starting with 'users'
```

### `cancel(key)`

Cancels an in-flight query without removing the cache entry. State transitions to `'success'` if data exists, otherwise `'idle'`.

```ts
qc.cancel(['users', 1]);
```

### `clear()`

Clears every cache entry. Active subscribers are notified with an `'idle'` state.

```ts
qc.clear(); // good to call on logout
```

### Stable Key Serialization

Object property order doesn't matter in query keys — Fetchit sorts keys before serialization.

```ts
// These produce the same cache entry
await qc.query({ key: ['users', { page: 1, role: 'admin' }], fn: ... });
await qc.query({ key: ['users', { role: 'admin', page: 1 }], fn: ... });
```

### Dispose

Both `createApi` and `createQuery` return clients that implement `[Symbol.dispose]` for deterministic cleanup.

```ts
{
  using api = createApi({ baseUrl: 'https://api.example.com' });
  using qc  = createQuery();
  // api and qc are automatically disposed at end of block
}

// Or manually:
qc.dispose(); // cancels all in-flight requests, clears all timers
api.dispose(); // clears in-flight dedup map and interceptors
```

## Standalone Mutation

`createMutation()` creates an observable, reusable mutation handle. Unlike `createQuery`, it has no cache key and never deduplicates — each `mutate()` call runs the function.

```ts
import { createMutation } from '@vielzeug/fetchit';

const createUser = createMutation(
  (data: NewUser) => api.post<User>('/users', { body: data }),
  {
    retry: false,     // default for mutations
    onSuccess: (user, variables) => qc.set(['users', user.id], user),
    onError: (error, variables) => console.error(error),
    onSettled: (data, error, variables) => qc.invalidate(['users']),
  },
);

const user = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

### Observable State

```ts
const unsub = createUser.subscribe((state) => {
  console.log(state.status);   // 'idle' | 'pending' | 'success' | 'error'
  console.log(state.isPending, state.data, state.error);
});

const snap = createUser.getState(); // MutationState<User>

createUser.reset(); // back to idle
unsub();
```

### Abort Signal

```ts
const controller = new AbortController();

createUser.mutate({ name: 'Alice' }, { signal: controller.signal });
controller.abort(); // cancels the mutation
```

## Error Handling

All non-2xx responses and network failures throw an `HttpError`.

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/99');
} catch (err) {
  if (HttpError.is(err, 404)) {
    console.log('Not found');
  } else if (HttpError.is(err)) {
    console.log(err.status, err.method, err.url);
    console.log(err.data);      // parsed response body (for non-2xx JSON responses)
    console.log(err.response);  // raw Response object
    console.log(err.cause);     // original error (for network failures)
  }
}
```

`HttpError.is(err, status?)` is a type-safe narrowing helper. Passing a status checks for an exact match.

```ts
// Check any HTTP error
HttpError.is(err)        // → true for any HttpError
// Check specific status
HttpError.is(err, 401)   // → true only for 401
HttpError.is(err, 404)   // → true only for 404
```

When a query errors, the `QueryState` transitions to `'error'` with the error on `state.error`. Aborted queries transition to `'idle'` (not `'error'`) with `error: null`.

## Common Patterns

### Optimistic Updates

```ts
// Apply optimistic update
qc.set<User>(['users', 1], (old) => ({ ...old!, name: 'New Name' }));

const updateUser = createMutation(
  (patch: Partial<User>) => api.put<User>('/users/{id}', { params: { id: 1 }, body: patch }),
);

try {
  await updateUser.mutate({ name: 'New Name' });
} catch {
  // Roll back on failure
  qc.invalidate(['users', 1]);
}
```

### Type-Safe Query Keys

```ts
const keys = {
  users: {
    all:    ()                          => ['users'] as const,
    detail: (id: number)                => ['users', id] as const,
    list:   (filters: { role?: string })=> ['users', 'list', filters] as const,
  },
} as const;

await qc.query({ key: keys.users.detail(42), fn: ... });
qc.invalidate(keys.users.all()); // invalidates all user keys
```

### Dependent Queries

```ts
const user = await qc.query({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
});

const posts = await qc.query({
  key: ['users', userId, 'posts'],
  fn: ({ signal }) => api.get<Post[]>('/users/{id}/posts', { params: { id: userId }, signal }),
  enabled: user !== undefined,
});
```

### Custom Retry Delay

```ts
await qc.query({
  key: ['data'],
  fn: ({ signal }) => api.get('/data', { signal }),
  retry: 4,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // 1s, 2s, 4s, 8s
});
```

## Why Fetchit?

Native `fetch` is excellent but low-level. Fetchit adds base URL, typed responses, path parameters, and error wrapping with virtually no overhead.

```ts
// Before — raw fetch
const res = await fetch(`https://api.example.com/users/${userId}`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const user: User = await res.json();

// After — Fetchit
const http = createHttp({ baseUrl: 'https://api.example.com' });
const user = await http.get<User>('/users/{id}', { params: { id: userId } });
```

| Feature           | Fetchit                                       | axios          | ky     |
| ----------------- | --------------------------------------------- | -------------- | ------ |
| Bundle size       | <PackageInfo package="fetchit" type="size" /> | ~30 kB         | ~5 kB  |
| Built on          | fetch                                         | XMLHttpRequest | fetch  |
| Path params       | ✅                                            | Manual         | Manual |
| Query client      | ✅                                            | ❌             | ❌     |
| Zero dependencies | ✅                                            | ❌             | ❌     |

**Use Fetchit when** you want lightweight typed HTTP with path parameter templating and a simple query cache.

## Import

```ts
import { createHttp, createQuery, createApi, HttpError } from '@vielzeug/fetchit';
```

## Basic Usage

### Two Ways to Use Fetchit

Fetchit provides flexible architecture:

1. **HTTP Client** – Pure HTTP operations without query overhead
2. **Query Client** – Advanced caching and state management
3. **Unified API** – `createApi()` combines both into one object
4. **Use Together or Independently** – Mix and match based on your needs

### HTTP Client (Simple HTTP Requests)

The HTTP client provides clean REST API methods without caching overhead. Perfect for simple requests.

#### Creating an HTTP Client

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({
  baseUrl: 'https://api.example.com',
  timeout: 30000, // 30 seconds (default: 30000)
  headers: {
    Authorization: 'Bearer token',
    'Content-Type': 'application/json',
  },
  dedupe: false, // Force-dedupe non-idempotent methods (GET/HEAD/OPTIONS always dedupe)
  logger: (level, msg, meta) => {
    // Optional: Custom logger for debugging
    console.log(`[${level.toUpperCase()}]`, msg, meta);
  },
});
```

**Options:**

- `baseUrl` – Base URL for all requests
- `timeout` – Request timeout in milliseconds (default: 30000)
- `headers` – Default headers for all requests
- `dedupe` – Force deduplication for non-idempotent methods (default: `false`; GET/HEAD/OPTIONS always dedupe)
- `logger` – Optional logger function for debugging requests

#### Making Requests

```ts
// GET request – returns raw data
const user = await http.get<User>('/users/1');
console.log(user.name);

// POST request
const created = await http.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});

// PUT request
const updated = await http.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});

// PATCH request
const patched = await http.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});

// DELETE request
await http.delete('/users/1');

// Custom method
const data = await http.request<DataType>('CUSTOM', '/endpoint');
```

#### Query String Parameters

```ts
const users = await http.get<User[]>('/users', {
  query: {
    role: 'admin',
    age: 18,
    page: 1,
  },
});
// Calls: /users?role=admin&age=18&page=1
```

#### Path Parameters

```ts
const user = await http.get<User>('/users/{id}', {
  params: { id: '123' },
});
// Calls: /users/123

const post = await http.get<Post>('/posts/{postId}', {
  params: { postId: '456' },
});
// Calls: /posts/456
```

#### Combined Path and Query String Parameters

```ts
const comments = await http.get<Comment[]>('/posts/{postId}/comments', {
  params: { postId: '456' },
  query: { sort: 'created_at', limit: 20 },
});
// Calls: /posts/456/comments?sort=created_at&limit=20
```

### Request Deduplication

GET, HEAD, and OPTIONS requests are **always** deduplicated — concurrent identical requests share one in-flight network call. POST, PUT, PATCH, and DELETE only deduplicate when `dedupe: true` is set on the client or per-request:

```ts
const http = createHttp({
  baseUrl: 'https://api.example.com',
  // dedupe: false is the default — only GET/HEAD/OPTIONS auto-dedupe
});

// GET requests always dedupe — only ONE network call is made
const [user1, user2, user3] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);

// All three get the same response
console.log(user1 === user2); // true
```

To deduplicate POST/PUT/PATCH/DELETE, set `dedupe: true` globally or per-request:

```ts
const http = createHttp({
  baseUrl: 'https://api.example.com',
  dedupe: true, // Dedupe all methods, including POST
});

// Or per-request:
const result = await http.post('/data', { body: payload, dedupe: true });
```

#### Managing Headers

```ts
// Update headers dynamically
http.headers({
  Authorization: `Bearer ${newToken}`,
});

// Remove a header
http.headers({
  Authorization: undefined,
});
```

### Query Client (Advanced Caching)

The Query client provides intelligent caching, request deduplication, and state management. Works with any HTTP client or fetch function.

#### Creating a Query Client

```ts
import { createQuery, createHttp } from '@vielzeug/fetchit';

const queryClient = createQuery({
  staleTime: 5000, // Data fresh for 5 seconds
  gcTime: 300000, // Keep in cache for 5 minutes
});

// Use with HTTP client
const http = createHttp({ baseUrl: 'https://api.example.com' });
```

#### Type-Safe Query Keys

```ts
// Define query keys manually with `as const` for type safety
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
} as const;

// Type-safe and autocomplete works!
const user = await queryClient.query({
  key: queryKeys.users.detail('123'),
  fn: () => http.get(`/users/123`),
});
```

#### Basic Query

```ts
// Fetch user with caching
const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
  staleTime: 5000, // Fresh for 5 seconds
  gcTime: 60000, // Keep in cache for 60 seconds
});
```

#### Query with Parameters

```ts
// Query key includes all parameters that affect the data
async function fetchUsers(filters: { role?: string; age?: number }) {
  return queryClient.query({
    key: ['users', filters], // Include filters in key
    fn: () => http.get<User[]>('/users', { query: filters }),
  });
}

const admins = await fetchUsers({ role: 'admin' });
const adults = await fetchUsers({ age: 18 });
```

#### Mutations (POST/PUT/DELETE)

`mutation()` returns a factory object with `mutate`, `subscribe`, `getState`, and `reset` methods:

```ts
// Create a mutation factory
const createUser = queryClient.mutation((userData: CreateUserInput) => http.post<User>('/users', { body: userData }), {
  retry: false,
});

// Subscribe to state changes
const unsubscribe = createUser.subscribe((state) => {
  console.log(state.status, state.data, state.error);
});

// Execute the mutation
const newUser = await createUser.mutate({
  name: 'John Doe',
  email: 'john@example.com',
});

// Invalidate after success
queryClient.invalidate(['users']);

unsubscribe();
```

#### Optimistic Updates

```ts
// Update user optimistically
queryClient.setData<User>(['users', userId], (old) => ({
  ...old,
  name: 'Updated Name',
}));

const updateUser = queryClient.mutation((updates: Partial<User>) =>
  http.put<User>(`/users/${userId}`, { body: updates }),
);

try {
  await updateUser.mutate({ name: 'Updated Name' });
  // Refetch to sync with server
  queryClient.invalidate(['users', userId]);
} catch (error) {
  // Rollback on error
  queryClient.invalidate(['users', userId]);
}
```

### Cache Management

```ts
// Invalidate specific query
queryClient.invalidate(['users', userId]);

// Manually set cache data
queryClient.setData(['users', 1], { id: 1, name: 'John' });

// Get cached data
const cachedUser = queryClient.getData(['users', 1]);

// Get query state (includes status, error, etc.)
const state = queryClient.getState(['users', 1]);
console.log(state?.status, state?.data);

// Subscribe to query changes
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('User data changed:', state.data);
  console.log('Loading:', state.isPending);
});

// Prefetch data
await queryClient.prefetch({
  key: ['users', '2'],
  fn: () => http.get('/users/2'),
});

// Clear all cache
queryClient.clear();
```

### Observable State

Subscribe to query state changes for real-time updates:

```ts
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('Status:', state.status); // 'idle' | 'pending' | 'success' | 'error'
  console.log('Data:', state.data);
  console.log('Error:', state.error);
  console.log('Loading:', state.isPending);
  console.log('Success:', state.isSuccess);
});

// Don't forget to cleanup
unsubscribe();
```

### Stable Query Keys

Fetchit uses stable key serialization, meaning **property order doesn't matter** for cache matching. This prevents cache misses caused by object property ordering.

```ts
// These two queries use the SAME cache entry
const key1 = ['users', { page: 1, filter: 'active' }];
const key2 = ['users', { filter: 'active', page: 1 }]; // Different order!

await queryClient.query({
  key: key1,
  fn: () => http.get('/users'),
});

// This will use the cached data from above
await queryClient.query({
  key: key2, // Same logical key, different property order
  fn: () => http.get('/users'),
});

// Also works with nested objects
const nestedKey1 = ['posts', { filters: { status: 'published', author: 'john' }, page: 1 }];
const nestedKey2 = ['posts', { page: 1, filters: { author: 'john', status: 'published' } }];
// ✅ These match!
```

::: tip 💡 Stable Serialization
Fetchit automatically sorts object keys before serialization, ensuring consistent cache keys regardless of property order. This is especially useful when keys are built dynamically or come from different sources.
:::

## Common Patterns

### Query with Retry

```ts
import { createQuery, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
  retry: 3, // 3 retries = 4 total attempts (1 initial + 3 retries)
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Disable retries
const data = await queryClient.query({
  key: ['data'],
  fn: fetchData,
  retry: false, // No retries (1 attempt only)
});
```

::: tip 💡 Retry Semantics

- `retry: 3` means **3 retry attempts** (4 total attempts: 1 initial + 3 retries)
- `retry: false` means **no retries** (1 attempt only)
- Default is `retry: 1` for queries
  :::

### Dependent Queries

```ts
// Fetch user first
const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
});

// Then fetch their posts
const posts = await queryClient.query({
  key: ['users', userId, 'posts'],
  fn: () => http.get<Post[]>(`/users/${userId}/posts`),
  enabled: !!user, // Only run if user exists
});
```

### Mutation with Invalidation

```ts
const createPost = queryClient.mutation((postData: NewPost) => http.post<Post>('/posts', { body: postData }));

await createPost.mutate(postData);

// Invalidate posts list to refetch
queryClient.invalidate(['posts']);
// Also invalidate user's posts
queryClient.invalidate(['users', userId, 'posts']);
```

## Advanced Features

### Canceling Requests with AbortController

You can cancel in-flight requests using AbortController:

```ts
const controller = new AbortController();

// Pass signal to HTTP client
const promise = http.get('/slow-endpoint', {
  signal: controller.signal,
});

// Cancel after 1 second
setTimeout(() => controller.abort(), 1000);

try {
  const data = await promise;
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

When a query is aborted:

- The query state is set to `'idle'` (not `'error'`)
- The `error` field is cleared (set to `null`)

```ts
const controller = new AbortController();

queryClient.query({
  key: ['data'],
  fn: () => http.get('/data', { signal: controller.signal }),
});

// Cancel the request
controller.abort(); // Query state becomes 'idle', not 'error'
```

::: tip 💡 Abort vs Error
Fetchit distinguishes between user-initiated aborts and actual errors. Aborted requests set the query status to `'idle'` with no error, while actual errors set the status to `'error'` with an error message.
:::

### Interceptors

Add middleware to intercept and transform every request/response with `use()`. The method returns a dispose function to remove the interceptor:

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

// Auth interceptor — injects a fresh token before each request
const removeAuth = http.use(async (ctx, next) => {
  const token = await getAccessToken();
  ctx.init.headers = {
    ...(ctx.init.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };
  return next(ctx);
});

// Logging interceptor
const removeLogger = http.use(async (ctx, next) => {
  console.log(`→ ${ctx.init.method ?? 'GET'} ${ctx.url}`);
  const start = Date.now();
  const response = await next(ctx);
  console.log(`← ${response.status} (${Date.now() - start}ms)`);
  return response;
});

// Remove interceptors when no longer needed
removeAuth();
removeLogger();
```

Interceptors run in registration order and can short-circuit the chain by returning a `Response` without calling `next(ctx)`.

### Unified API

`createApi()` is a convenience factory that returns an object combining both `HttpClient` and `QueryClient` methods:

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  staleTime: 5000,
});

// HTTP methods available directly
const user = await api.get<User>('/users/1');

// Query methods also available
const cachedUser = await api.query({
  key: ['users', '1'],
  fn: () => api.get<User>('/users/1'),
});

api.headers({ Authorization: 'Bearer token' });
api.invalidate(['users']);
```

### Query Options

All available query options:

```ts
import { createQuery, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),

  // Caching
  staleTime: 5000, // Data fresh for 5 seconds
  gcTime: 60000, // Keep in cache for 60 seconds

  // Execution
  enabled: true, // Enable/disable query

  // Retry
  retry: 3, // Number of retries (or false)
  retryDelay: 1000, // Delay between retries (or function)
});
```

### Mutation Pattern

`mutation()` creates a reusable mutation factory. Use `subscribe()` to react to state changes:

```ts
import { createQuery, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

const createUser = queryClient.mutation((userData: NewUser) => http.post<User>('/users', { body: userData }), {
  retry: false, // Don't retry mutations by default
});

// Subscribe to state changes
const unsubscribe = createUser.subscribe((state) => {
  if (state.isSuccess) console.log('Created:', state.data);
  if (state.isError) console.error('Failed:', state.error);
});

// Execute the mutation
await createUser.mutate(userData);

// Get current state
const state = createUser.getState();

// Reset state back to idle
createUser.reset();

unsubscribe();
```

### Cache Management

```ts
import { createQuery } from '@vielzeug/fetchit';

const queryClient = createQuery();

// Invalidate specific query
queryClient.invalidate(['users', 1]);

// Set query data manually (optimistic updates)
queryClient.setData(['users', 1], { id: 1, name: 'John' });

// Update with function
queryClient.setData<User[]>(['users'], (old = []) => [...old, newUser]);

// Get cached data
const cachedUser = queryClient.getData(['users', 1]);

// Clear all cache
queryClient.clear();
```

### URL Building

Use the `query` option to append query string parameters to URLs:

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

const users = await http.get('/api/users', {
  query: { page: 1, limit: 10, active: true },
});
// Calls: /api/users?page=1&limit=10&active=true
```

### Error Handling

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`Request failed: ${error.method} ${error.url}`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
  }
}
```

### File Uploads

Fetchit automatically handles FormData:

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

// Content-Type is set automatically by the browser
await http.post('/upload', { body: formData });
```

### Binary Data

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

// Blob
const blob = new Blob(['content'], { type: 'text/plain' });
await http.post('/upload', { body: blob });

// ArrayBuffer
const buffer = new ArrayBuffer(8);
await http.post('/data', { body: buffer });

// URLSearchParams
const params = new URLSearchParams();
params.append('key', 'value');
await http.post('/form', { body: params });
```

## Configuration Options

### `HttpClientOptions`

```ts
{
  baseUrl?: string;          // Base URL for all requests
  headers?: Record<string, string>; // Default headers
  timeout?: number;          // Request timeout in ms (default: 30000)
  dedupe?: boolean;          // Force-dedupe non-idempotent methods (default: false)
  logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void; // Optional debug logger
}
```

### `HttpRequestConfig`

```ts
{
  body?: unknown;            // Request body (auto-serialized to JSON for plain objects)
  params?: Record<string, string | number | boolean | undefined>; // Path parameters
  query?: Record<string, string | number | boolean | undefined>; // Query string parameters
  timeout?: number;          // Per-request timeout override (ms)
  dedupe?: boolean;          // Enable/disable deduplication for this request
  signal?: AbortSignal;      // AbortSignal for request cancellation
  // ...all standard RequestInit options
}
```

### `QueryClientOptions`

```ts
{
  staleTime?: number;  // Time before data is stale in ms (default: 0)
  gcTime?: number;     // Garbage collection time in ms (default: 300000)
  retry?: number | false;  // Default retry attempts (default: 1)
  retryDelay?: number | ((attempt: number) => number);
}
```

## Best Practices

1. **Create one client per API**: Don't create a new client for each request
2. **Use custom IDs for cache control**: Makes invalidation easier
3. **Handle errors properly**: Use HttpError for better debugging
4. **Clean up on logout**: Call `clear()` when user logs out
5. **Use TypeScript**: Define response types for better type safety

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
