---
title: Courier Migration
---

# Courier Migration

## Courier 3.0

Courier 3.0 owns HTTP transport, explicit parsed GET caching, prefetching, immutable middleware, and structured errors. Observable query state, mutations, SSE helpers, streams, and mutable headers moved to their owning layers.

### Replace `queries` / `mutate()` with cached GETs or consumer-owned state

`queries`, query snapshots, subscriptions, `mutate()`, and `invalidateKeys` are removed. Use a structured `cache` descriptor when only bounded TTL caching, prefix invalidation, and in-flight deduplication are needed. Compose Courier into a dedicated state layer when the application needs observable query or mutation state.

```ts
// Before
await courier.queries.fetch({
  key: ['users', 1],
  fetch: ({ signal }) => courier.get('/users/{id}', { params: { id: 1 }, signal }),
});
await courier.mutate({
  request: ({ signal }) => courier.post('/users', { body: { name: 'Ada' }, signal }),
  invalidateKeys: [['users']],
});

// After — use explicit cached reads without observable query state.
const user = await courier.get('/users/{id}', {
  cache: { key: ['users', 1], ttlMs: 30_000 },
  params: { id: 1 },
});
await courier.post('/users', { body: { name: 'Ada' } });
courier.invalidateCache(['users']);
```

For loading/error snapshots, automatic refetch, optimistic mutations, or framework bindings, use a dedicated server-state cache or explicit application state. Sourcerer is limited to paginated collection state and does not own cache keys, invalidation, or mutations. See [Optimistic Updates](./examples/optimistic-updates.md) for an explicit state-owner pattern.

For remote collections, compose Courier into a focused Sourcerer collection source:

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const users = createPageSource<User>({
  load: async ({ page, pageSize, signal }) => {
    const result = await courier.get<{ data: User[]; total: number }>('/users', {
      query: { page, pageSize },
      signal,
    });
    return { items: result.data, totalItems: result.total };
  },
});

await users.reload();
```

### `request()` and method conveniences

`request(path, { method, ... })` supports custom and dynamically selected methods. `get()`, `post()`, `put()`, `patch()`, and `delete()` remain available for common methods.

```ts
await courier.post('/users', { body: { name: 'Ada' } });
await courier.patch('/users/1', { body: { name: 'Ada' } });
await courier.request('/documents/1', { method: 'LOCK' });
```

### Replace mutable `use()` with immutable `middleware` at construction

The onion middleware plus mutable `use()` is replaced by an immutable `middleware` array configured at construction. There is no runtime mutation of the middleware chain.

```ts
// Before
const courier = createCourier({ baseUrl: 'https://api.example.com' });
courier.use(withBearerAuth('token'));
courier.use(withRequestId());

// After
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withBearerAuth('token'), withRequestId()],
});
```

### Replace `setHeaders()` / `getHeaders()` with construction-time `headers`

The mutable header store is removed. Set default headers at construction; use middleware for dynamic headers.

```ts
// Before
const courier = createCourier();
courier.setHeaders({ authorization: 'Bearer token' });

// After
const courier = createCourier({ headers: { authorization: 'Bearer token' } });
```

### `events()` / `read()` removed

SSE and streaming iterators moved to the owning state layer. Prefer native `EventSource` for standard cookie-authenticated SSE. When custom headers or request bodies require `fetch`, request a raw response with an explicit caller signal and `timeout: Infinity`; Courier keeps the body attached to `cancelAll()` and `dispose()` until it completes or is cancelled.

```ts
const controller = new AbortController();
const response = await courier.get<Response>('/events', {
  responseType: 'raw',
  signal: controller.signal,
  timeout: Infinity,
});

try {
  for await (const chunk of response.body ?? []) consume(chunk);
} finally {
  controller.abort();
}
```

See [SSE Events](./examples/sse-events.md) for framing and reconnection ownership.

### Keep transport observation with `tap()`

`tap()` remains a transport-level, observation-only API for structured request start, success, failure, and disposal events. Observer failures never affect requests, and an optional signal owns subscription lifetime. Use `withLogging()` when one logger is sufficient.

### `cancelAll()` no longer owns mutation state

`cancelAll()` aborts active HTTP requests, including shared cached loads, and prevents those pending results from entering the cache. It retains settled cached values. Mutation cancellation belongs to the state layer that owns it.

### Recheck request boundaries

- Timeouts must be integer milliseconds from 1 through 2,147,483,647, or `Infinity`.
- GET and HEAD requests reject bodies before dispatch.
- Raw responses cannot use a schema; consume or cancel every raw body.
- ReadableStream uploads set Node's required `duplex: 'half'` transport option.
- Query values are inserted before URL fragments.
- NodeNext declarations now use explicit `.js` specifiers.

## Courier 2.0

Courier 2.0 simplifies the public API surface: removes redundant methods, merges invalidation and refetch into
one call, adds cache garbage collection, and makes the mutation API earn its name with `invalidateKeys`.

### Replace `courier.headers()` with `courier.setHeaders()`

`headers(updates)` was a mutating setter named like a getter. Renamed to `setHeaders(updates)` for clarity.

```ts
// Before
courier.headers({ authorization: 'Bearer token' });

// After
courier.setHeaders({ authorization: 'Bearer token' });
```

### Replace `invalidate()` + `refetchStale()` with `invalidate(prefix, { refetch: true })`

`refetchStale()` is removed. `invalidate()` now accepts an optional `{ refetch: true }` option that refetches
matching entries in the background — one call instead of two.

```ts
// Before
courier.queries.invalidate(['users']);
courier.queries.refetchStale();

// After
courier.queries.invalidate(['users'], { refetch: true });
```

### Use `mutate({ invalidateKeys })` instead of manual invalidation in `onSuccess`

`MutationOptions` gains `invalidateKeys`: key prefixes to invalidate and refetch after a successful write. This
replaces the common `onSuccess` boilerplate of `invalidate()` + `refetchStale()`.

```ts
// Before
await courier.mutate({
  request: ({ signal }) => courier.post('/users', { body: { name: 'Ada' }, signal }),
  onSuccess: (_user, queries) => {
    queries.invalidate(['users']);
    queries.refetchStale();
  },
});

// After
await courier.mutate({
  request: ({ signal }) => courier.post('/users', { body: { name: 'Ada' }, signal }),
  invalidateKeys: [['users']],
});
```

### `courier.request` removed from public instance

The generic `request(method, url, config)` method was removed from the public `Courier` type. Use `get()`, `post()`,
`put()`, `patch()`, or `delete()` instead.

### `withLogging()` now requires an explicit `logger`

The default `console.debug` logger is removed. Pass a `logger` function explicitly.

```ts
// Before
courier.use(withLogging());

// After
courier.use(withLogging({ logger: (msg) => console.log(msg) }));
```

### `CourierError.is()` removed

Use `instanceof CourierError` directly. `CourierHttpError.is(err, status?)` is retained — the status filter is
genuinely useful.

### `QueryKeyAtom` no longer accepts objects

Key atoms are now `string | number | boolean | null` only. Object atoms were speculative flexibility with no
consumers; removing them makes prefix matching predictable (`===` instead of structural hash).

### Cache garbage collection

The query cache now garbage-collects entries with no subscribers after `gcTime` (default 5 min). Configure via
`createCourier({ query: { gcTime: 30_000 } })` or disable with `gcTime: Infinity`.

### Empty JSON response bodies

`parseResponse` now returns `undefined` for empty (or whitespace-only) bodies with a JSON content-type instead of
throwing `SyntaxError`.

### Replace `debugCourier()` with `withLogging()`

The `@vielzeug/courier/devtools` subpath and `debugCourier()` export are removed. Use `withLogging()` directly — it is the same one-line composition.

```ts
// Before
import { debugCourier } from '@vielzeug/courier/devtools';
const client = debugCourier({ baseUrl: 'https://api.example.com' });

// After
import { createCourier, withLogging } from '@vielzeug/courier';
const client = createCourier({ baseUrl: 'https://api.example.com' });
client.use(withLogging({ logger: (msg) => console.log(msg) }));
```

### Update `invalidate()` call sites if passing typed `QueryKey` variables

`invalidate()` now accepts `readonly unknown[]` instead of `QueryKey`. Existing calls with `QueryKey` values still compile — the change is a type widening, not a narrowing. No code changes required unless you were relying on the exact `QueryKey` type for overload resolution.

### Consolidate client setup

Create one `Courier` instance with `createCourier` and move shared transport, interceptor, and request configuration there.

### Adopt query handles and direct mutations

Replace prior query and mutation integration points with the 2.0 query-handle and direct-mutation contracts. Keep request lifecycle handling at each query or mutation boundary.

### Consume streams as async iterables

Update streaming consumers to iterate over the 2.0 stream API with `for await...of`. Ensure application cleanup still handles abort and disposal.

The sections above describe the historical 1.x → 2.x transition. For the current HTTP and explicit-cache contract, follow the Courier 3.0 section and the [API Reference](./api.md).
