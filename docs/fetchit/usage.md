---
title: Fetchit — Usage Guide
description: HTTP client, cache, lean mutations, interceptors, and error handling for Fetchit.
---

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

GET, HEAD, OPTIONS, and DELETE requests are deduplicated automatically. Writes are never deduplicated unless you pass an explicit `dedupeKey`.

```ts
// Only ONE network call is made
const [a, b, c] = await Promise.all([api.get('/users/1'), api.get('/users/1'), api.get('/users/1')]);
console.log(a === b); // true — same promise

// Writes only dedupe when you give them a stable key
const result = await api.post('/data', { body: payload, dedupeKey: ['save-draft', draftId] });
```

### Per-Request Options

All standard `RequestInit` options are supported alongside Fetchit extensions:

```ts
const data = await api.get<Data>('/protected', {
  headers: { 'X-Custom': 'value' }, // per-request headers merged over globals
  signal: controller.signal, // AbortSignal for cancellation
  timeout: 5_000, // override client-level timeout
});
```

### Query Param Arrays

`query` supports scalars, arrays, and `null`.

```ts
await api.get('/users', {
  query: { page: [1, 2], search: null, role: 'admin' },
});
// → /users?page=1&page=2&search=&role=admin
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

`createQuery()` provides cache-backed reads with request deduplication, prefix invalidation, and reactive subscriptions for any async data source.

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
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `key` | `QueryKey` | required | Cache identifier; serialized with stable key ordering |
| `fn` | `(ctx: QueryFnContext) => Promise<T>` | required | Data-fetching function; receives `{ key, signal }` |
| `staleTime` | `number` | `0` | ms served from cache before the next `query()` call refetches |
| `gcTime` | `number` | `300000` | ms before an unobserved entry is GC'd at background priority while unobserved |

Retry behavior is configured on the query client (`createQuery({ retry, retryDelay, shouldRetry })`) rather than per query call.

::: tip Retry semantics
`retry: 3` means **3 retries** (4 total attempts: 1 initial + 3 retries). `retry: 0` means 1 attempt only.
:::

### `prefetch(options)`

Warms cache data ahead of use (for example, route hover or page transition preloads). It uses the same key/fn/staleness semantics as `query()` but resolves to `void`.

```ts
await qc.prefetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 10_000,
});

// Next query can serve from warm cache
const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 10_000,
});
```

By default `prefetch()` swallows errors after updating query state to `'error'`. Use `throwOnError: true` to rethrow.

```ts
await qc.prefetch({
  key: ['config'],
  fn: ({ signal }) => api.get('/config', { signal }),
  throwOnError: true,
});
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
// → { data, error, status, updatedAt }
```

### `subscribe(key, listener)`

Subscribes to live `QueryState` updates for a key. Fires immediately with the current state. Returns an unsubscribe function.

```ts
const unsub = qc.subscribe<User>(['users', 1], (state) => {
  console.log(state.status); // 'idle' | 'pending' | 'success' | 'error'
  console.log(state.data); // T | undefined
  console.log(state.error); // Error | null
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

`createMutation()` creates an observable, reusable mutation handle. Each call receives `{ input, signal }`. Cancellation is caller-owned: pass an `AbortSignal` when you need one.

```ts
import { createMutation } from '@vielzeug/fetchit';

const createUser = createMutation(({ input, signal }: { input: NewUser; signal?: AbortSignal }) =>
  api.post<User>('/users', { body: input, signal }),
);

const user = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
qc.set(['users', user.id], user);
qc.invalidate(['users']);
```

### Caller-Owned Cancellation

```ts
const controller = new AbortController();
createUser.mutate({ name: 'Alice', email: 'alice@example.com' }, { signal: controller.signal });
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

When a query errors, the `QueryState` transitions to `'error'` with the error on `state.error`. Aborted queries fall back to `'idle'` when no previous data exists, or back to `'success'` when a stale value was already cached.

## Common Patterns

### Optimistic Updates

```ts
// Apply optimistic update
qc.set<User>(['users', 1], (old) => ({ ...old!, name: 'New Name' }));

const updateUser = createMutation(({ input, signal }: { input: Partial<User>; signal?: AbortSignal }) =>
  api.put<User>('/users/{id}', { params: { id: 1 }, body: input, signal }),
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

if (user) {
  await qc.query({
    key: ['users', userId, 'posts'],
    fn: ({ signal }) => api.get<Post[]>('/users/{id}/posts', { params: { id: userId }, signal }),
  });
}
```

### Custom Retry Delay

```ts
const retryingQc = createQuery({
  retry: 4,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // 1s, 2s, 4s, 8s
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500, // skip 4xx
});

await retryingQc.query({
  key: ['data'],
  fn: ({ signal }) => api.get('/data', { signal }),
});
```
