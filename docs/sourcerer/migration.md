---
title: Sourcerer 3.0 Migration
---

# Sourcerer 3.0 Migration

Sourcerer 3.0 narrows the package to reactive collection sources. It replaces package-defined query fields with consumer-owned params, standardizes source state and commands, and removes the query-cache subpath.

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

`@vielzeug/sourcerer/query`, `createQuerySource()`, query handles, keyed invalidation, retries, optimistic mutations, and cache garbage collection are removed. No replacement lives in Sourcerer 3.0.

Use a dedicated server-state cache when shared keyed caching is required. Keep simple uncached reads in Sourcerer loaders and keep HTTP behavior in Courier.

## Remove generic base exports

`Disposable`, `Source`, `SourceSnapshot`, `AnyPagination`, query types, and the old query patch/result types are no longer public. Import concrete source, state, context, result, and pagination types instead.
