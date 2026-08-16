---
title: Courier Migration
---

# Courier Migration

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

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current client, query, mutation, and stream contracts.
