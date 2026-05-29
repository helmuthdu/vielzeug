---
title: Courier — Usage Guide
description: HTTP client, query cache, unified client, SSE, readable streams, and framework integration for Courier.
---

[[toc]]

::: tip New to Courier?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

## Unified Client

`createCourier()` combines `api`, `stream`, `query`, and `mutation()` behind one shared transport.

```ts
import { createCourier } from '@vielzeug/courier';

type NewUser = { name: string };
type User = { id: number; name: string };

const client = createCourier({
  baseUrl: 'https://api.example.com',
  headers: { authorization: `Bearer ${token}` },
  timeout: 30_000,
  query: { staleTime: 30_000 },
});

client.use(async (ctx, next) => {
  ctx.init.headers = {
    ...(ctx.init.headers as Record<string, string>),
    'x-request-id': crypto.randomUUID(),
  };
  return next(ctx);
});

const user = await client.query.fetch({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

const createUser = client.mutation((input: NewUser, signal) =>
  client.api.post<User>('/users', { body: input, signal }),
);

await createUser.mutate({ name: 'Alice' });
client.stream.sse('/events', { reconnect: true });
```

`timeout` applies to REST requests. SSE and readable streams default to `Infinity` per connection unless you override `timeout` explicitly.

## HTTP Client

`createApi()` returns a thin HTTP client built on the native `fetch` API.

### Creating a Client

```ts
import { createApi } from '@vielzeug/courier';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 30_000, // default: 30 000 ms
  headers: { Authorization: 'Bearer token' },
  fetch: globalThis.fetch, // optional
});

// Disable timeouts explicitly when needed
const noTimeoutApi = createApi({ timeout: Infinity });
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

### Cancelling In-Flight Requests

`cancelAll()` aborts every active request without disposing the client. The client stays usable for new requests immediately after.

```ts
// Route change — drop all pending background fetches
api.cancelAll();

// Client is still alive and ready
const fresh = await api.get<Config>('/config');
```

### Request Deduplication

GET, HEAD, OPTIONS, and DELETE requests are deduplicated automatically by **method + URL + responseType**. Request headers are not part of the automatic dedupe key anymore. Writes are never deduplicated unless you pass an explicit `dedupeKey`.

```ts
// Only ONE network call is made
const [a, b, c] = await Promise.all([api.get('/users/1'), api.get('/users/1'), api.get('/users/1')]);
console.log(a === b); // true — same promise

// Opt out when you explicitly want separate requests
await api.get('/users/1', { dedupe: false });

// Writes only dedupe when you give them a stable key
const result = await api.post('/data', { body: payload, dedupeKey: ['save-draft', draftId] });
```

### Per-Request Options

All standard `RequestInit` options are supported alongside Courier extensions:

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
import { NO_RETRY, createQuery } from '@vielzeug/courier';

const qc = createQuery({
  staleTime: 0,
  gcTime: 300_000,
  maxAttempts: NO_RETRY,
  retryDelay: undefined,
  shouldRetry: undefined,
  refetchOnFocus: false,
  refetchOnReconnect: false,
});
```

### `fetch(options)`

Fetches data with automatic caching, deduplication, and retry. The `fn` receives a `QueryFnContext` with both the cache `key` and an `AbortSignal`.

```ts
const user = await qc.fetch({
  key: ['users', userId],
  fn: ({ key, signal }) => api.get<User>('/users/{id}', { params: { id: key[1] as number }, signal }),
  staleTime: 5_000,
  maxAttempts: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});
```

| Option         | Type                                  | Default              | Description                                                                     |
| -------------- | ------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `key`          | `QueryKey`                            | required             | Cache identifier; serialized with stable key ordering                           |
| `fn`           | `(ctx: QueryFnContext) => Promise<T>` | required             | Data-fetching function; receives `{ key, signal }`                              |
| `staleTime`    | `number`                              | `0`                  | ms served from cache before the next `fetch()` call refetches                   |
| `gcTime`       | `number`                              | `300000`             | ms before an unobserved entry is GC'd while unobserved                          |
| `maxAttempts`  | `number`                              | query-client default | Total attempts for this specific fetch                                          |
| `retryDelay`   | `number \| (attempt) => number`       | query-client default | Delay strategy for this specific fetch                                          |
| `shouldRetry`  | `(error, attempt) => boolean`         | query-client default | Retry predicate for this specific fetch                                         |
| `enabled`      | `boolean`                             | `true`               | Skip the fetch when `false`; existing cached data is returned                   |
| `initialData`  | `T \| () => T \| undefined`           | —                    | Pre-seed the cache as a successful entry when no data exists                    |

Per-fetch retry options override `createQuery()` defaults when provided.

::: tip Retry semantics
`maxAttempts: 3` means **3 total attempts**. `maxAttempts: 1` or `NO_RETRY` means one try with no retries.
:::

### Conditional Fetching

Set `enabled: false` to skip the fetch. Useful for dependent queries or fields that should not load until the user interacts.

```ts
const posts = await qc.fetch({
  key: ['users', userId, 'posts'],
  fn: ({ signal }) => api.get<Post[]>('/posts', { query: { userId }, signal }),
  enabled: userId != null,
});
```

### Seeding Cache Data

`initialData` pre-populates the cache as a successful entry before the first fetch. If data already exists the value is ignored.

```ts
const user = await qc.fetch({
  key: ['users', id],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id }, signal }),
  staleTime: 30_000,
  initialData: () => qc.get<User[]>(['users'])?.find((u) => u.id === id),
});
```

### Prefetch

Warms cache data ahead of use. It uses the same key, function, and staleness semantics as `fetch()` but resolves to `void`.

```ts
await qc.prefetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 10_000,
});

const user = await qc.fetch({
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
const cached = qc.get<User>(['users', 1]);

qc.set(['users', 1], { id: 1, name: 'Alice' });
qc.set<User[]>(['users'], (old = []) => [...old, newUser]);

const state = qc.getState<User>(['users', 1]);
```

### `subscribe(key, listener, opts?)`

Subscribes to live `QueryState` updates for a key. It fires immediately with the current state and is best for imperative listeners.

```ts
const unsub = qc.subscribe<User>(['users', 1], (state) => {
  console.log(state.status);
  console.log(state.data);
  console.log(state.error);
});

unsub();
```

`select` projects a smaller slice and `placeholderData` fills the pending state without touching the cache.

```ts
const unsub = qc.subscribe<User, string>(['users', 1], (state) => renderName(state.data), {
  select: (user) => user?.name,
  placeholderData: 'Loading…',
});
```

### `watch(key, opts?)`

`watch()` returns a `SyncStore<QueryState<T>>` for frameworks such as React, Vue, and Svelte.

```ts
const store = qc.watch<User, string>(['users', 1], {
  select: (user) => user?.name,
  placeholderData: 'Loading…',
});

const initial = store.peek();
const stop = store.subscribe(() => {
  console.log(store.peek());
});

stop();
```

Unlike `subscribe()`, `watch()` does **not** fire immediately. Read the initial snapshot with `peek()`.

### `invalidate(key)`

For entries **without active subscribers**, invalidation evicts the cache entry immediately. For entries **with active subscribers**:

- If the entry has a stored query function (registered via `fetch()`), it is background-revalidated.
- If the entry was only populated via `set()`, it resets to `idle`.

Supports **prefix matching**: invalidating `['users']` affects `['users', 1]`, `['users', 2]`, and so on.

```ts
qc.invalidate(['users', 1]);
qc.invalidate(['users']);
```

### `cancel(key)`

Cancels an in-flight fetch without removing the cache entry. State transitions back to `'success'` if data exists, otherwise `'idle'`.

```ts
qc.cancel(['users', 1]);
```

### `clear()`

Clears every cache entry. Active subscribers are notified with an `'idle'` state.

```ts
qc.clear();
```

### Background Revalidation

Enable automatic revalidation of stale observed entries when the tab regains focus or the network reconnects.

```ts
const qc = createQuery({
  staleTime: 30_000,
  refetchOnFocus: true,
  refetchOnReconnect: true,
});
```

Only entries with active observers are revalidated automatically. `qc.dispose()` removes the event listeners.

### Stable Key Serialization

Object property order doesn't matter in query keys — Courier sorts keys before serialization.

```ts
await qc.fetch({
  key: ['users', { page: 1, role: 'admin' }],
  fn: ({ signal }) => api.get('/users', { query: { page: 1, role: 'admin' }, signal }),
});
await qc.fetch({
  key: ['users', { role: 'admin', page: 1 }],
  fn: ({ signal }) => api.get('/users', { query: { page: 1, role: 'admin' }, signal }),
});
```

### Dispose

Both `createApi()` and `createQuery()` implement `[Symbol.dispose]` for deterministic cleanup.

```ts
{
  using api = createApi({ baseUrl: 'https://api.example.com' });
  using qc = createQuery();
}

qc.dispose();
api.dispose();
```

## Mutation

When using `createCourier()`, create mutations directly from the client — no extra import needed:

```ts
const createUser = client.mutation(
  (input: NewUser, signal) => client.api.post<User>('/users', { body: input, signal }),
  {
    maxAttempts: 2,
    onSuccess: (user) => {
      client.query.set(['users', user.id], user);
      client.query.invalidate(['users']);
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => hideSpinner(),
  },
);

const user = await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

Any options set via `mutationDefaults` in `createCourier()` are automatically merged into every `client.mutation()` call.

When not using `createCourier()`, use `createMutation()` standalone:

```ts
import { createMutation } from '@vielzeug/courier';

const createUser = createMutation(
  (input: NewUser, signal: AbortSignal) => api.post<User>('/users', { body: input, signal }),
  { maxAttempts: 2 },
);
```

### Lifecycle Callbacks

Callbacks are defined on the mutation, not the call site. They fire after each `mutate()` run.

| Callback    | Signature                                 | Called when                           |
| ----------- | ----------------------------------------- | ------------------------------------- |
| `onSuccess` | `(data: TData) => void \| Promise<void>`  | The run succeeds                      |
| `onError`   | `(error: Error) => void \| Promise<void>` | The run fails (not aborted)           |
| `onSettled` | `(data, error) => void \| Promise<void>`  | After every run regardless of outcome |

### Cancellation

```ts
createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
await createUser.cancel();
```

```ts
const controller = new AbortController();
createUser.mutate({ name: 'Alice', email: 'alice@example.com' }, { signal: controller.signal });
controller.abort();
```

## Server-Sent Events

Use `createStream()` directly or reuse `client.stream` from `createCourier()`.

```ts
import { createStream } from '@vielzeug/courier';

const stream = createStream({ baseUrl: 'https://api.example.com' });

const source = stream.sse<{ message: { text: string }; ping: null }>('/events', {
  reconnect: true,
  onError: (error) => console.error('SSE closed permanently:', error.message),
});

source.on('message', (data) => console.log(data.text));
source.on('ping', () => {});

source.close();
```

`reconnect: true` uses full-jitter exponential backoff with a default budget of 5 reconnects. You can customize that budget with `maxAttempts`.

```ts
const source = stream.sse('/events', {
  reconnect: {
    maxAttempts: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  },
});
```

SSE connections:

- parse standard `data`, `event`, and `id` fields
- JSON-parse non-string payloads automatically
- send `Last-Event-ID` on reconnect
- use the shared interceptor pipeline
- keep the reconnect budget across clean server closes and failures

## HTTP Streaming

Use `stream.readable()` for raw text chunks or NDJSON streams.

```ts
for await (const chunk of stream.readable('/completions', {
  body: { prompt },
})) {
  process.stdout.write(chunk);
}
```

```ts
type ChatMessage = { content: string };

for await (const msg of stream.readable<ChatMessage>('/chat', {
  body: { prompt },
  parse: 'ndjson',
})) {
  console.log(msg.content);
}
```

`parse: 'text'` is the default. Streaming connections default to `Infinity` timeout per connection unless you pass `timeout` explicitly.

## Framework Store Integration

Courier exposes a minimal external-store contract compatible with any framework.

::: code-group

```tsx [React]
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCourier } from '@vielzeug/courier';

const client = createCourier({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 30_000 },
});

type User = { id: number; name: string };

function useUserName(id: number) {
  const store = useMemo(
    () =>
      client.query.watch<User, string>(['users', id], {
        select: (user) => user?.name,
        placeholderData: 'Loading…',
      }),
    [id],
  );

  useEffect(() => {
    void client.query.fetch({
      key: ['users', id],
      fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
    });
  }, [id]);

  return useSyncExternalStore(store.subscribe, store.peek);
}
```

```ts [Vue 3]
import { onScopeDispose, shallowRef, watchEffect } from 'vue';
import { createCourier } from '@vielzeug/courier';

const client = createCourier({ baseUrl: 'https://api.example.com' });

type User = { id: number; name: string };

function useUserName(id: number) {
  const store = client.query.watch<User, string>(['users', id], {
    select: (user) => user?.name,
    placeholderData: 'Loading…',
  });
  const name = shallowRef(store.peek().data);
  const stop = store.subscribe(() => {
    name.value = store.peek().data;
  });

  watchEffect(() => {
    void client.query.fetch({
      key: ['users', id],
      fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
    });
  });

  onScopeDispose(stop);

  return { name };
}
```

```ts [Svelte]
import { readable } from 'svelte/store';
import { createCourier } from '@vielzeug/courier';

const client = createCourier({ baseUrl: 'https://api.example.com' });

type User = { id: number; name: string };

export function userNameStore(id: number) {
  const store = client.query.watch<User, string>(['users', id], {
    select: (user) => user?.name,
    placeholderData: 'Loading…',
  });

  void client.query.fetch({
    key: ['users', id],
    fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
  });

  return readable(store.peek(), (set) => {
    set(store.peek());
    return store.subscribe(() => set(store.peek()));
  });
}
```

:::

## Error Handling

All non-2xx responses and network failures throw an `HttpError`.

```ts
import { HttpError } from '@vielzeug/courier';

try {
  await api.get('/users/99');
} catch (err) {
  if (HttpError.is(err, 404)) {
    console.log('Not found');
  } else if (HttpError.is(err)) {
    console.log(err.status, err.method, err.url);
    console.log(err.data);
    console.log(err.response);
  }
}
```

`HttpError.kind` exposes `'http' | 'network' | 'abort' | 'timeout'`, and `HttpError.headers` gives direct access to response headers.

## Common Patterns

### Optimistic Updates

```ts
client.query.set<User>(['users', 1], (old) => ({ ...old!, name: 'New Name' }));

const updateUser = client.mutation(
  (input: Partial<User>, signal) =>
    client.api.put<User>('/users/{id}', { params: { id: 1 }, body: input, signal }),
);

try {
  await updateUser.mutate({ name: 'New Name' });
} catch {
  client.query.invalidate(['users', 1]);
}
```

### Type-Safe Query Keys

```ts
const keys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: number) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
} as const;

await qc.fetch({
  key: keys.users.detail(42),
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 42 }, signal }),
});
qc.invalidate(keys.users.all());
```

### Dependent Queries

```ts
const user = await qc.fetch({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
});

if (user) {
  await qc.fetch({
    key: ['users', userId, 'posts'],
    fn: ({ signal }) => api.get<Post[]>('/users/{id}/posts', { params: { id: userId }, signal }),
  });
}
```

### Custom Retry Delay

The built-in default uses full-jitter exponential backoff. Override it per query client or per individual fetch.

```ts
const retryingQc = createQuery({
  maxAttempts: 4,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});

await retryingQc.fetch({
  key: ['data'],
  fn: ({ signal }) => api.get('/data', { signal }),
});
```

### Pitfalls

- `maxAttempts: 1` means one try and no retries.
- Use `dedupe: false` when method + URL + response type are the same but you explicitly want separate requests.
- `watch()` does not emit immediately; call `peek()` for the initial snapshot.
- Long-lived streams default to `Infinity` timeout per connection.

## Working with Other Vielzeug Libraries

### With Sieve

Validate response payloads at the API boundary before using them.

```ts
import { createApi } from '@vielzeug/courier';
import { s } from '@vielzeug/sieve';

const api = createApi({ baseUrl: 'https://api.example.com' });

const UserSchema = s.object({ id: s.number(), name: s.string().min(1) });

async function getUser(id: number) {
  const raw = await api.get<unknown>('/users/{id}', { params: { id } });
  return UserSchema.parse(raw); // throws ValidationError on unexpected shape
}
```

### With Ripple

Use a Ripple store to hold the query result and drive reactive UI without framework-specific hooks.

```ts
import { createApi, createQuery } from '@vielzeug/courier';
import { store, effect } from '@vielzeug/ripple';

type User = { id: number; name: string };
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 30_000 });

const userStore = store<{ user: User | null; loading: boolean }>({ user: null, loading: false });

async function loadUser(id: number) {
  userStore.patch({ loading: true });
  const user = await qc.fetch({ key: ['users', id], fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id }, signal }) });
  userStore.patch({ user, loading: false });
}

effect(() => console.log('user:', userStore.value.user?.name));
```

## Best Practices

- Prefer `createCourier()` when your app needs REST, streams, shared interceptors, and one place to manage headers. Use `client.mutation()` for mutations — no separate import needed.
- Use `maxAttempts` consistently: `1` means one try and no retries.
- Set `staleTime` on `createQuery` to match your data's freshness requirements; default is `0`.
- Use `qc.invalidate([prefix])` after successful mutations to refresh related cached data.
- Always pass the `signal` from query and mutation functions to the underlying request.
- Use `dedupe: false` when you intentionally want separate in-flight requests for the same method + URL + response type.
- Use `qc.watch()` and `mutation.toStore()` for framework bindings; keep `subscribe()` for imperative listeners.
- Remember the timeout split: REST requests default to 30s, SSE and readable streams default to `Infinity` per connection.
- Dispose long-lived clients in server-side code and tests to avoid leaking listeners or in-flight work.
