---
title: 'Sourcerer: Migration Guide'
description: Migrate collection state and commands, and adopt page reconciliation and single-value resources.
---

Breaking changes ship in CalVer trains. Sourcerer replaces package-defined query fields with
consumer-owned params, standardizes source state and commands, and removes the query-cache subpath.

## Reconcile page and params atomically

`PageSource.apply()` is additive. Replace sequential filter and page commands when both values
come from one URL or view-state update.

```ts
// Before
await source.setParams(params);
await source.goTo(page);

// After
await source.apply({ page, params });
```

The call issues at most one load and compares params structurally. Changed params use the supplied
positive page without clamping against old totals, or page one when omitted. Unchanged params use
normal page clamping. Omitted or `undefined` params preserve the requested value; use
`setParams(undefined)` to replace it with `undefined`.

## Use a resource for one value

`createResource()` is additive; it does not restore the removed query cache. Replace collection
wrapping when the loader returns one object.

```ts
// Before
const profile = createPageSource({
  load: async ({ signal }) => ({ items: [await loadProfile(signal)], totalItems: 1 }),
});
await profile.reload();
console.log(profile.state.items[0]);

// After
const profile = createResource({
  load: ({ signal }) => loadProfile(signal),
  start: false,
});
await profile.reload();
console.log(profile.state.data);
```

Without `start: false`, a resource starts during construction and reports initial failures through
`state.error`. Explicit reloads reject current failures, preserve previous data, and abort stale work.

## Replace snapshots with state

Read `state.items` and `state.loading`. Async commands now return `Promise<void>` instead of returning a snapshot.

```ts
// Before
const snapshot = await source.load();
console.log(snapshot.data, snapshot.isFetching);

// After
await source.reload();
console.log(source.state.items, source.state.loading);
```

Subscriptions receive the same state object exposed by `source.state`.

## Replace query patches with params

Move search, filters, sort values, and other loader inputs into one application-owned value. `setParams()` replaces that value and resets pagination.

```ts
// Before
const source = createPageSource<User, RoleFilter, UserSort>({
  initialQuery: { filter: { role: 'admin' }, search: 'ada', sort: { field: 'name' } },
  load: async ({ query, signal }) => loadUsers(query, signal),
});
await source.updateQuery({ search: 'grace' });

// After
type Params = { filter: { role: string }; search: string; sort: { field: string } };
const source = createPageSource<User, Params>({
  load: async ({ page, pageSize, params, signal }) => loadUsers({ page, pageSize, ...params }, signal),
  params: { filter: { role: 'admin' }, search: 'ada', sort: { field: 'name' } },
});
await source.setParams({ ...source.state.params, search: 'grace' });
```

When `TParams` excludes `undefined`, `params` is required at construction. While replacement params load, committed items remain paired with `state.params`; the requested value appears in `state.pendingParams`.

## Flatten navigation commands

Navigation methods now live directly on each source.

```ts
// Before
await source.page.goTo(2);
await source.page.next();

// After
await source.goTo(2);
await source.next();
```

Use `first()`, `goTo()`, `last()`, `next()`, and `previous()` on page sources. Cursor sources expose `next()` and `previous()`.

## Rename configuration and result fields

```ts
// Before
const source = createInfiniteSource({
  initialQuery: { pageSize: 20 },
  load: async ({ query }) => ({ data: await loadPage(query.page), total: 100 }),
});

// After
const source = createInfiniteSource({
  load: async ({ page }) => ({ items: await loadPage(page), totalItems: 100 }),
  pageSize: 20,
});
```

| Before | After |
| --- | --- |
| `initialQuery.page` | Call `goTo(page)` after construction |
| `initialQuery.pageSize` | `pageSize` |
| `initialQuery.search/filter/sort` | `params` |
| loader `query.page` | loader `page` |
| loader `query.pageSize` | loader `pageSize` |
| loader result `data` | loader result `items` |
| loader result `total` | loader result `totalItems` |
| `snapshot.pendingQuery` | `state.pendingParams` |
| `setData()` | `setItems()` |

Pagination no longer includes a `kind` discriminant. Each factory returns one concrete pagination type.

## Handle superseded commands

Superseded and disposed in-flight work now settles without committing. It no longer waits for a newer command and returns that newer command’s snapshot. Current loader failures still reject and update `state.error`.

```ts
const first = source.setParams({ search: 'a' });
const second = source.setParams({ search: 'ada' });
await Promise.all([first, second]);
console.log(source.state.params); // { search: 'ada' }
```

## Remove the query-cache subpath

`@vielzeug/sourcerer/query`, `createQuerySource()`, query handles, keyed invalidation, retries, optimistic mutations, and cache garbage collection are removed. No keyed cache replacement lives in Sourcerer.

Use a dedicated server-state cache when shared keyed caching is required. Keep simple uncached reads in Sourcerer loaders and keep HTTP behavior in Courier.

## Remove generic base exports

`Disposable`, `Source`, `SourceSnapshot`, `AnyPagination`, query types, and the old query patch/result types are no longer public. Import concrete source, state, context, result, and pagination types instead.
