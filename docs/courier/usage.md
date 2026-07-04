---
title: Courier — Usage Guide
description: HTTP client, query cache, unified client, SSE, readable streams, and framework integration for Courier.
---

[[toc]]

::: tip New to Courier?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

## Basic Usage

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
  return next(ctx.withHeaders({ 'x-request-id': crypto.randomUUID() }));
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

GET, HEAD, and OPTIONS requests are deduplicated automatically by **method + URL + responseType**. DELETE is idempotent but has side effects, so it does not auto-dedupe — pass an explicit `dedupeKey` to opt in. Request headers are not part of the automatic dedupe key. Writes (POST, PUT, PATCH) are never deduplicated unless you pass an explicit `dedupeKey`.

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
  return next(ctx.withHeaders({ Authorization: `Bearer ${token}` }));
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

### Built-in Interceptor Presets

Three ready-to-use presets are exported:

```ts
import { withBearerAuth, withLogging, withRequestId } from '@vielzeug/courier';

// Inject a Bearer token — static or async (useful for refresh flows)
client.use(withBearerAuth('my-token'));
client.use(withBearerAuth(async () => tokenStore.getAccessToken()));

// Add a unique request ID header (default: x-request-id populated with crypto.randomUUID())
client.use(withRequestId());
client.use(withRequestId({ header: 'x-trace-id', generate: () => ulid() }));

// Log method, URL, status, and duration to console.debug
client.use(withLogging());
client.use(withLogging({ logger: (msg, meta) => structuredLogger.info(msg, meta) }));
```

`withBearerAuth` handles `undefined`, plain object, array-of-tuples, and `Headers` instance inputs in `ctx.init.headers` — no manual spread required.

### Debug Logging

Import `debugCourier` from the dedicated `/devtools` sub-path to create a `Courier` instance with `withLogging()` already registered. The sub-path is tree-shaken from production bundles when not imported.

::: warning Development only
`withLogging()` logs the full request URL, including any query parameters — if those may contain tokens or PII, use `createCourier()` with a custom `withLogging({ logger })` that sanitizes the URL instead, or none at all in production.
:::

```ts
import { debugCourier } from '@vielzeug/courier/devtools';

const client = debugCourier({ baseUrl: 'https://api.example.com' });

await client.api.get('/users');
// GET https://api.example.com/users 200 (42ms)
```

## Query Client

`createQuery()` provides cache-backed reads with request deduplication, prefix invalidation, and reactive subscriptions for any async data source.

### Creating a Query Client

```ts
import { createQuery } from '@vielzeug/courier';

const qc = createQuery({
  staleTime: 0, // ms to serve from cache before refetching (default: 0 = always stale)
  gcTime: 300_000, // ms before an unobserved entry is GC'd (default: 5 min)
  times: 1, // 1 = one try with no retries
});
```

### `fetch(options)`

Fetches data with automatic caching, deduplication, and retry. The `fn` receives a `QueryFnContext` with both the cache `key` and an `AbortSignal`.

```ts
const user = await qc.fetch({
  key: ['users', userId],
  fn: ({ key, signal }) => api.get<User>('/users/{id}', { params: { id: key[1] as number }, signal }),
  staleTime: 5_000,
  times: 3,
  shouldRetry: (err) => !CourierHttpError.is(err) || (err.status ?? 500) >= 500,
});
```

| Option            | Type                                       | Default              | Description                                                               |
| ----------------- | ------------------------------------------ | -------------------- | ------------------------------------------------------------------------- |
| `key`             | `QueryKey`                                 | required             | Cache identifier; serialized with stable key ordering                     |
| `fn`              | `(ctx: QueryFnContext) => Promise<T>`      | required             | Data-fetching function; receives `{ key, signal }`                        |
| `staleTime`       | `number`                                   | `0`                  | ms served from cache before the next `fetch()` call refetches             |
| `gcTime`          | `number`                                   | `300000`             | ms before an unobserved entry is GC'd while unobserved                    |
| `times`           | `number`                                   | query-client default | Total attempts for this specific fetch; `1` means one try with no retries |
| `delay`           | `number \| (attempt) => number`            | query-client default | Delay strategy for this specific fetch                                    |
| `shouldRetry`     | `(error, attempt) => boolean`              | query-client default | Retry predicate for this specific fetch                                   |
| `enabled`         | `boolean`                                  | `true`               | Skip the fetch when `false`; existing cached data is returned             |
| `initialData`     | `T \| () => T \| undefined`                | —                    | Pre-seed the cache as a successful entry when no data exists              |
| `placeholderData` | `S \| () => S \| undefined`                | —                    | **Observe only.** Pass as part of `ObserveOptions` — ignored by `fetch()` |
| `select`          | `(data: T \| undefined) => S \| undefined` | —                    | **Observe only.** Pass as part of `ObserveOptions` — ignored by `fetch()` |

Per-fetch retry options override `createQuery()` defaults when provided.

::: tip Retry semantics
`times: 3` means **3 total attempts**. `times: 1` means one try with no retries.
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

### Warming the Cache

Use `fetch()` to warm the cache before a page renders. `fetch()` always throws on error — wrap with `try/catch` or use `Promise.allSettled` when warming multiple keys in parallel.

```ts
// Warm the cache
try {
  await qc.fetch({
    key: ['users', 1],
    fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
    staleTime: 10_000,
  });
} catch {
  // Error stored in cache state; qc.getState(['users', 1]).status === 'error'
}

// Later reads hit the cache if still within staleTime
const user = await qc.fetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 10_000,
});
```

### Cache Access

```ts
const cached = qc.get<User>(['users', 1]);

// Set a value (updatedAt defaults to Date.now())
qc.set(['users', 1], { id: 1, name: 'Alice' });
qc.set<User[]>(['users'], (old = []) => [...old, newUser]);

// Restore a persisted entry with its original timestamp so staleTime checks are accurate
qc.set(['users', 1], persistedData, { updatedAt: storedTimestamp });

const state = qc.getState<User>(['users', 1]);
```

### `watchKey(key)`

`watchKey()` returns a `SyncStore<QueryState<T>>` for a single key without triggering any fetch. Use it when another code path is responsible for populating the cache entry.

```ts
const store = qc.watchKey<User>(['users', 1]);

const initial = store.peek(); // idle state if not yet fetched
const stop = store.subscribe(() => {
  console.log(store.peek());
});

stop();
```

The store does **not** fire immediately. Read the initial snapshot with `peek()`. For `select` or `placeholderData` support, use `observe({ fetch: false, ... })` instead.

### `observeMany(keys)`

`observeMany()` returns a combined `SyncStore<QueryState<T>[]>` that updates whenever any of the specified keys change. Useful for parallel query status aggregation.

```ts
const store = qc.observeMany<User>([
  ['users', 1],
  ['users', 2],
]);
const states = store.peek(); // QueryState<User>[]
const stop = store.subscribe(() => {
  const [user1, user2] = store.peek();
  if (user1.status === 'success' && user2.status === 'success') render(user1.data, user2.data);
});
```

### `observe(options)`

`observe()` is the preferred API for components: it returns a `SyncStore<QueryState<S>>` **and** triggers a background fetch if the cache entry is stale or missing. Pass `placeholderData` and `select` directly on the options object — no second argument needed.

```ts
const store = qc.observe({
  key: ['users', id],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id }, signal }),
  staleTime: 30_000,
  placeholderData: { id: 0, name: 'Loading…' },
});

// Synchronously read the current state
console.log(store.peek().status); // 'idle' or 'pending'
console.log(store.peek().data); // placeholderData while fetching

// Subscribe to future changes
const stop = store.subscribe(() => {
  const state = store.peek();
  if (state.status === 'success') render(state.data);
});
```

Use `select` to project to a derived type — TypeScript infers `S` from the return type:

```ts
// store is SyncStore<QueryState<string>>
const store = qc.observe<User, string>({
  key: ['users', id],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id }, signal }),
  select: (user) => user?.name,
  placeholderData: 'Loading…',
});
```

In React, pass `observe()` directly to `useSyncExternalStore`:

```tsx
function useUser(id: number) {
  const store = useMemo(
    () =>
      client.query.observe({
        key: ['users', id],
        fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
        staleTime: 30_000,
      }),
    [id],
  );
  return useSyncExternalStore(store.subscribe, store.peek);
}
```

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

`refetchStale()` revalidates all stale observed entries. Use `bindRefetch()` to wire it up to browser lifecycle events — tab visibility and network reconnection:

```ts
import { bindRefetch, createQuery } from '@vielzeug/courier';

const qc = createQuery({ staleTime: 30_000 });

// Returns an unbind function — call it on cleanup to remove the listeners
const unbind = bindRefetch(qc);

// later, e.g. on logout or component teardown:
unbind();
```

Alternatively, pass `qc.disposalSignal` so listeners are removed automatically when the query client is disposed — no manual unbind needed:

```ts
bindRefetch(qc, { signal: qc.disposalSignal });
```

`bindRefetch` attaches a `visibilitychange` listener (fires when `document.visibilityState` becomes `'visible'`) and an `online` listener on `window`. Only entries with active subscribers that are past their `staleTime` are revalidated. Error entries with stale data are also eligible once their `updatedAt` age exceeds `staleTime`.

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

## Query Cache Persistence

Persist successful cache entries across page reloads with `persistQueryCache()` and `hydrateQueryCache()`.

```ts
import { createQuery, hydrateQueryCache, persistQueryCache } from '@vielzeug/courier';

const qc = createQuery({ staleTime: 60_000 });

// Hydrate on page load (before any fetch calls)
await hydrateQueryCache(qc, {
  keys: [['users', userId], ['settings']],
  storage: localStorage,
});

// Wire up persistence for future writes (also eagerly persists any already-successful entries)
const stopPersisting = persistQueryCache(qc, {
  keys: [['users', userId], ['settings']],
  storage: localStorage,
});

// Stop on logout
stopPersisting();
qc.clear();
```

**`PersistOptions`:**

| Option    | Type                                       | Default      | Description                                                               |
| --------- | ------------------------------------------ | ------------ | ------------------------------------------------------------------------- |
| `storage` | `PersistStorage`                           | required     | Any sync or async `getItem` / `setItem` backend                           |
| `keys`    | `QueryKey[] \| (key: QueryKey) => boolean` | required     | Explicit list of keys **or** predicate applied to all cached keys         |
| `prefix`  | `string`                                   | `'courier:'` | Storage key namespace to avoid collisions                                 |
| `maxAge`  | `number`                                   | —            | Max entry age in ms during hydration; entries older than this are skipped |
| `onError` | `(err, key) => void`                       | silent       | Called when a storage read or write fails                                 |

`hydrateQueryCache` restores the original `updatedAt` timestamp so staleTime checks after hydration are accurate — 55-second-old hydrated data with `staleTime: 60_000` will be refetched after 5 more seconds, not after a full 60 seconds.

```ts
// Custom async storage (IndexedDB adapter)
const idbStorage: PersistStorage = {
  getItem: (key) => idb.get(key),
  setItem: (key, value) => idb.put(key, value),
};

await hydrateQueryCache(qc, {
  keys: [['products']],
  maxAge: 24 * 60 * 60_000, // skip entries older than 1 day
  onError: (err, key) => console.warn('Hydration failed for', key, err),
  storage: idbStorage,
});
```

## DataLoader-Style Batcher

`createBatcher()` coalesces individual `load()` calls made within the same scheduling window into a single `resolve()` call, eliminating N+1 request patterns.

```ts
import { createBatcher } from '@vielzeug/courier';

const userLoader = createBatcher({
  resolve: async (ids: number[]) => api.post<User[]>('/users/batch', { body: { ids } }),
});

// These three calls collapse into one POST /users/batch { ids: [1, 2, 3] }
const [alice, bob, carol] = await Promise.all([userLoader.load(1), userLoader.load(2), userLoader.load(3)]);
```

**Options:**

| Option    | Type                          | Default  | Description                                                                                |
| --------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `resolve` | `(keys: K[]) => Promise<V[]>` | required | Execute a batch and return results **in the same order as `keys`**                         |
| `maxSize` | `number`                      | `25`     | Force-flush when the queue reaches this size                                               |
| `window`  | `number`                      | `0`      | Scheduling window in ms. `0` = next microtask; positive value coalesces across async ticks |

```ts
// Custom window and batch size
const loader = createBatcher({
  maxSize: 100,
  resolve: async (keys) => fetchBatch(keys),
  window: 16, // collect for one animation frame
});

// Dispose — rejects all queued promises and prevents further use
loader.dispose();
// or use the explicit resource management syntax:
// using loader = createBatcher(...);
```

::: warning Result ordering
`resolve()` **must** return an array in the same order as `keys`. A length mismatch rejects all pending promises.
:::

## Mutations

When using `createCourier()`, create mutations directly from the client — no extra import needed:

```ts
const createUser = client.mutation(
  (input: NewUser, signal) => client.api.post<User>('/users', { body: input, signal }),
  {
    times: 2,
    // Cache shorthands: applied automatically on success before onSuccess fires
    sets: (user) => [['users', user.id], user],
    invalidates: [['users']],
    onSuccess: (user, variables) => console.log('Created:', variables.name),
    onError: (err, variables) => toast.error(`Failed to create ${variables.name}: ${err.message}`),
    onSettled: (result) => {
      if (result.status !== 'aborted') hideSpinner(result.variables);
    },
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
  { times: 2 },
);
```

### Lifecycle Callbacks

Callbacks are defined on the mutation, not the call site. They fire after each `mutate()` run. Every callback receives the original `variables` passed to `mutate()`.

| Callback    | Signature                                                             | Called when                                                                        |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `onSuccess` | `(data: TData, variables: TVariables) => void \| Promise<void>`       | The run succeeds                                                                   |
| `onError`   | `(error: Error, variables: TVariables) => void \| Promise<void>`      | The run fails; **not** called on abort                                             |
| `onSettled` | `(result: SettledResult<TData, TVariables>) => void \| Promise<void>` | After every run including abort; switch on `result.status` for exhaustive handling |

::: tip Concurrent mutations
When multiple `mutate()` calls run simultaneously, state reflects the **latest** call. Each callback fires for its own call independently. Use `mutation.cancel()` before a new `mutate()` for last-call-wins semantics.
:::

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

source.dispose();
```

`reconnect: true` uses full-jitter exponential backoff with a default budget of 5 reconnects after the first failure.

```ts
const source = stream.sse('/events', {
  reconnect: {
    times: 2,
    delay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
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

## Error Handling

Courier throws distinct error classes for different failure modes:

| Class                   | When thrown                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `CourierHttpError`             | Non-2xx HTTP response — has `status`, `data`, `headers`                |
| `CourierNetworkError`          | Connection failed before any response was received                     |
| `CourierTimeoutError`          | Request aborted by the configured timeout                              |
| `CourierAbortError`            | Request cancelled via `cancel()`, `cancelAll()`, or an external signal |
| `CourierSchemaValidationError` | `schema.parse()` rejected the response body                            |

All extend `CourierError`. Use `CourierError.is(err)` to catch any Courier error, then narrow:

```ts
import { CourierAbortError, CourierHttpError, CourierNetworkError, CourierTimeoutError } from '@vielzeug/courier';

try {
  await api.get('/users/99');
} catch (err) {
  if (CourierHttpError.is(err, 404)) {
    console.log('Not found');
  } else if (CourierHttpError.is(err)) {
    console.log(err.status, err.method, err.url);
    console.log(err.data);
    console.log(err.headers.get('x-request-id'));
  } else if (err instanceof CourierTimeoutError) {
    console.log('Timed out after', err.url);
  } else if (err instanceof CourierAbortError) {
    // User navigated away — ignore
  } else if (err instanceof CourierNetworkError) {
    console.log('Connection failed:', err.cause);
  }
}
```

## Common Patterns

### Optimistic Updates

```ts
client.query.set<User>(['users', 1], (old) => ({ ...old!, name: 'New Name' }));

const updateUser = client.mutation((input: Partial<User>, signal) =>
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
  times: 4,
  delay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  shouldRetry: (err) => !CourierHttpError.is(err) || (err.status ?? 500) >= 500,
});

await retryingQc.fetch({
  key: ['data'],
  fn: ({ signal }) => api.get('/data', { signal }),
});
```

### Pitfalls

- `times: 1` means one try and no retries.
- Use `dedupe: false` when method + URL + response type are the same but you explicitly want separate requests.
- `observe()` does **not** emit immediately; call `peek()` for the initial snapshot.
- `observe()` returns a **new object on every call** — memoize it in framework hooks (e.g. React `useMemo`) to avoid re-subscribing on every render.
- Long-lived streams default to `Infinity` timeout per connection.

## Framework Integration

Courier exposes a minimal external-store contract compatible with any framework.

::: code-group

```tsx [React]
import { useMemo, useSyncExternalStore } from 'react';
import { createCourier } from '@vielzeug/courier';

const client = createCourier({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 30_000 },
});

type User = { id: number; name: string };

function useUserName(id: number) {
  // observe() returns a store AND triggers a background fetch if stale
  const store = useMemo(
    () =>
      client.query.observe<User, string>({
        key: ['users', id],
        fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
        staleTime: 30_000,
        select: (user) => user?.name ?? '',
      }),
    [id],
  );

  const state = useSyncExternalStore(store.subscribe, store.peek);
  return state.status === 'success' ? state.data : null;
}
```

```ts [Vue 3]
import { onScopeDispose, shallowRef, watchEffect } from 'vue';
import { createCourier } from '@vielzeug/courier';

const client = createCourier({ baseUrl: 'https://api.example.com' });

type User = { id: number; name: string };

function useUserName(id: number) {
  // observe() triggers a background fetch and returns a store with select support
  const store = client.query.observe<User, string>({
    key: ['users', id],
    fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
    staleTime: 30_000,
    select: (user) => user?.name,
    placeholderData: 'Loading…',
  });
  const name = shallowRef(store.peek().data);
  const stop = store.subscribe(() => {
    name.value = store.peek().data;
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
  // observe() triggers a background fetch and exposes select + placeholderData
  const store = client.query.observe<User, string>({
    key: ['users', id],
    fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id }, signal }),
    staleTime: 30_000,
    select: (user) => user?.name,
    placeholderData: 'Loading…',
  });

  return readable(store.peek(), (set) => {
    set(store.peek());
    return store.subscribe(() => set(store.peek()));
  });
}
```

:::

## Working with Other Vielzeug Libraries

### With Spell

Validate response payloads at the API boundary before using them.

```ts
import { createApi } from '@vielzeug/courier';
import { s } from '@vielzeug/spell';

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
  const user = await qc.fetch({
    key: ['users', id],
    fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id }, signal }),
  });
  userStore.patch({ user, loading: false });
}

effect(() => console.log('user:', userStore.value.user?.name));
```

## Best Practices

- Prefer `createCourier()` when your app needs REST, streams, shared interceptors, and one place to manage headers. Use `client.mutation()` for mutations — no separate import needed.
- Use `times` consistently: `1` means one try and no retries.
- Set `staleTime` on `createQuery` to match your data's freshness requirements; default is `0`.
- Use the `invalidates` and `sets` shorthands on `client.mutation()` to keep the cache in sync without boilerplate in `onSuccess`.
- Always pass the `signal` from query and mutation functions to the underlying request.
- Use `dedupe: false` when you intentionally want separate in-flight requests for the same method + URL + response type.
- Use `observe()` for components — it triggers a background fetch and supports `select` and `placeholderData`. Use `observe({ fetch: false })` when the cache is populated by another path and you only need the store.
- Use `mutation.store`, `mutation.peek()`, or `mutation.subscribe()` for framework bindings; `mutation.store` is a stable `SyncStore` reference suitable for `useSyncExternalStore`.
- Use `bindRefetch(qc)` instead of `refetchOnFocus`/`refetchOnReconnect` options — it is fully opt-in and the returned unbind function gives you explicit control.
- Remember the timeout split: REST requests default to 30s, SSE and readable streams default to `Infinity` per connection.
- When using `persistQueryCache`, call it **after** `hydrateQueryCache` resolves. Already-successful entries are eagerly persisted on setup.
- Dispose long-lived clients in server-side code and tests to avoid leaking listeners or in-flight work.
