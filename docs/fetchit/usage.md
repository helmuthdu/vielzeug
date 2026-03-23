---
title: Fetchit — Usage Guide
description: HTTP client, query client, standalone mutations, interceptors, and error handling for Fetchit.
---

# Fetchit Usage Guide

::: tip New to Fetchit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## HTTP Client

`createApi()` returns a thin HTTP client built on the native `fetch` API.

### Creating a Client

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 30_000, // default: 30 000 ms
  headers: { Authorization: 'Bearer token' },
  dedupe: false, // default: false — GET/HEAD/OPTIONS always dedupe regardless
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
const patched = await api.patch<User>('/users/1', { body: { email: 'new@example.com' } });
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
  params: { postId: 1, commentId: 99 },
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

GET, HEAD, OPTIONS, and DELETE requests are **always** deduplicated — concurrent identical in-flight calls share one network request.

```ts
// Only ONE network call is made
const [a, b, c] = await Promise.all([api.get('/users/1'), api.get('/users/1'), api.get('/users/1')]);
console.log(a === b); // true — same promise

// To deduplicate POST/PUT/PATCH/DELETE, opt in per-client or per-request
const api2 = createApi({ baseUrl: '...', dedupe: true });
const result = await api.post('/data', { body: payload, dedupe: true });
```

### Per-Request Options

All standard `RequestInit` options are supported alongside Fetchit extensions:

```ts
const data = await api.get<Data>('/protected', {
  headers: { 'X-Custom': 'value' }, // per-request headers merged over globals
  signal: controller.signal, // AbortSignal for cancellation
  timeout: 5_000, // override client-level timeout
  dedupe: false, // disable deduplication for this request
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
  staleTime: 0, // default: 0 — data is immediately stale
  gcTime: 300_000, // default: 5 min — GC runs at background priority once an entry is unobserved
  retry: 1, // default: 1 retry attempt
  retryDelay: undefined, // default: exponential backoff (1s → 2s → 4s → … up to 30s)
  shouldRetry: undefined, // default: undefined — retries all errors
});
```

### `query(options)`

Fetches data with automatic caching, deduplication, and retry. The `fn` receives a `QueryFnContext` with both the cache `key` and an `AbortSignal`.

```ts
const user = await qc.query({
  key: ['users', userId],
  fn: ({ key, signal }) => api.get<User>('/users/{id}', { params: { id: key[1] as number }, signal }),
  staleTime: 5_000,
  retry: 3,
});
```

| Option        | Type                                  | Default     | Description                                                                |
| ------------- | ------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `key`         | `QueryKey`                            | required    | Cache identifier; serialized with stable key ordering                      |
| `fn`          | `(ctx: QueryFnContext) => Promise<T>` | required    | Data-fetching function; receives `{ key, signal }`                         |
| `staleTime`   | `number`                              | `0`         | ms served from cache before the next `query()` call refetches              |
| `gcTime`      | `number`                              | `300000`    | ms before an unobserved entry is GC'd at background priority (paused while observed) |
| `enabled`     | `boolean`                             | `true`      | Pass `false` to skip execution and return cached data if present           |
| `retry`       | `number \| false`                     | `1`         | Number of retry attempts (`false` = no retries)                            |
| `retryDelay`  | `number \| (attempt) => number`       | exponential | Delay between retries                                                      |
| `shouldRetry` | `(error, attempt) => boolean`         | —           | Return `false` to skip retrying for a specific error (e.g. `4xx`)          |
| `onSuccess`   | `(data: T) => void`                   | —           | Called after a successful fetch; not called on cache hits                  |
| `onError`     | `(error: Error) => void`              | —           | Called after a failed fetch (not called when aborted)                      |
| `onSettled`   | `(data, error) => void`               | —           | Called after a triggered fetch settles; not called on cache/inflight reuse |

::: tip Retry semantics
`retry: 3` means **3 retries** (4 total attempts: 1 initial + 3 retries). `retry: false` means 1 attempt only.
:::

### Query Callbacks

`onSuccess`, `onError`, and `onSettled` are per-call callbacks. They fire only when the `query()` call **triggers a real fetch** — cache hits and inflight reuse skip them entirely. Only the triggering call's callbacks run; concurrent callers sharing the same inflight promise do not receive callbacks.

```ts
await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  onSuccess: (data) => toast.success(`Loaded ${data.name}`),
  onError: (err) => toast.error(err.message),
  onSettled: (data, error) => analytics.track('users.load', { ok: !error }),
});
```

::: tip vs. `subscribe()`
Use callbacks for **fire-and-forget side effects** (toasts, analytics) tied to a specific call. Use `subscribe()` for **reactive UI** that needs to track the full state lifecycle (loading spinners, error displays) and survives re-renders.
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
qc.set<User[]>(['users'], (old = []) => [...old, newUser]); // updater function

// Full state snapshot
const state = qc.getState<User>(['users', 1]);
// → { data, error, status, updatedAt, isPending, isSuccess, isError, isIdle }
```

### `subscribe(key, listener)`

Subscribes to live `QueryState` updates for a key. Fires immediately with the current state. Returns an unsubscribe function.

```ts
const unsub = qc.subscribe<User>(['users', 1], (state) => {
  console.log(state.status); // 'idle' | 'pending' | 'success' | 'error'
  console.log(state.data); // T | undefined
  console.log(state.error); // Error | null
  console.log(state.isPending, state.isSuccess, state.isError, state.isIdle);
});

unsub(); // stop listening
```

Subscribing keeps the cache entry alive (cancels any pending GC timer). When the last subscriber leaves, `'idle'` entries are removed immediately; non-idle entries start a new `gcTime` countdown.

### `invalidate(key)`

Cancels any in-flight request and removes the entry — or resets it to `'idle'` if it has active subscribers. Supports **prefix matching**: invalidating `['users']` purges `['users', 1]`, `['users', 2]`, etc.

```ts
qc.invalidate(['users', 1]); // exact match
qc.invalidate(['users']); // all keys starting with 'users'
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
await qc.query({
  key: ['users', { page: 1, role: 'admin' }],
  fn: ({ signal }) => api.get('/users', { query: { page: 1, role: 'admin' }, signal }),
});
await qc.query({
  key: ['users', { role: 'admin', page: 1 }],
  fn: ({ signal }) => api.get('/users', { query: { page: 1, role: 'admin' }, signal }),
});
```

### Dispose

Both `createApi` and `createQuery` return clients that implement `[Symbol.dispose]` for deterministic cleanup.

```ts
{
  using api = createApi({ baseUrl: 'https://api.example.com' });
  using qc = createQuery();
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

const createUser = createMutation((data: NewUser) => api.post<User>('/users', { body: data }), {
  retry: false, // default for mutations
  onSuccess: (user, variables) => qc.set(['users', user.id], user),
  onError: (error, variables) => console.error(error),
  onSettled: (data, error, variables) => qc.invalidate(['users']),
});

const user = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

### `cancel()`

Aborts the current in-flight mutation. State transitions to `'idle'` if it was pending, otherwise the state is unchanged. Useful for unmounting components without waiting for a slow mutation to finish.

```ts
// Cancel programmatically
createUser.cancel();

// Or pass an AbortSignal for external control
const controller = new AbortController();
createUser.mutate({ name: 'Alice' }, { signal: controller.signal });
controller.abort();
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
    console.log(err.data); // parsed response body (for non-2xx JSON responses)
    console.log(err.response); // raw Response object
    console.log(err.cause); // original error (for network failures)
  }
}
```

`HttpError.is(err, status?)` is a type-safe narrowing helper. Passing a status checks for an exact match.

```ts
// Check any HTTP error
HttpError.is(err); // → true for any HttpError
// Check specific status
HttpError.is(err, 401); // → true only for 401
HttpError.is(err, 404); // → true only for 404
```

When a query errors, the `QueryState` transitions to `'error'` with the error on `state.error`. Aborted queries transition to `'idle'` (not `'error'`) with `error: null`.

## Common Patterns

### Optimistic Updates

```ts
// Apply optimistic update
qc.set<User>(['users', 1], (old) => ({ ...old!, name: 'New Name' }));

const updateUser = createMutation((patch: Partial<User>) =>
  api.put<User>('/users/{id}', { params: { id: 1 }, body: patch }),
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
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500, // skip 4xx
});
```
