---
title: Sourcerer Migration
---

# Sourcerer Migration

## 2.2

Sourcerer 2.2 simplifies the infinite source contract and tightens `pendingQuery` semantics.

### `InfinitePagination.isLoadingMore` removed

The `isLoadingMore` field is gone. Derive append state from `snapshot.isFetching` with `pendingQuery` absent: `isFetching && !pendingQuery` means an append is in progress; `isFetching && pendingQuery` means a query replace is in progress.

```diff
- if (snapshot.pagination.isLoadingMore) { /* append loading */ }
+ if (snapshot.isFetching && !snapshot.pendingQuery) { /* append loading */ }
```

### `InfiniteSourceConfig.load` context typed as `InfiniteLoadQuery`

The load context for infinite sources no longer exposes phantom `filter` and `sort` fields from `PageQuery`. The context query is now `InfiniteLoadQuery` — `{ page, pageSize, search }`. If your loader referenced `query.filter` or `query.sort`, remove those reads; they were always `undefined`.

```diff
  const source = createInfiniteSource({
    load: async ({ query }) => {
-     const filter = query.filter;
      const start = (query.page - 1) * query.pageSize;
      return { data: items.slice(start, start + query.pageSize), total: items.length };
    },
  });
```

### `pendingQuery` no longer set during infinite append fetches

`pendingQuery` now consistently means "a different query is in flight" across all source types. `loadMore()` no longer sets it. If you rendered a "loading new results" indicator by checking `pendingQuery` on an infinite source, switch to `snapshot.isFetching`.

Review the [Usage Guide](./usage.md#gotchas) for the full `pendingQuery` contract.

## 2.0

Sourcerer 2.0 replaces source APIs with atomic snapshots.

### Read one snapshot at a time

Update consumers to derive UI and application state from `SourceSnapshot` values. Treat each snapshot as one atomic view of source state instead of reading and combining mutable source fields independently.

### Update source integrations

Migrate local, page, cursor, and infinite source integrations to their 2.0 source and query contracts. Recheck pagination, query patches, loading state, and disposal behavior.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current source, snapshot, query, and pagination contracts.
