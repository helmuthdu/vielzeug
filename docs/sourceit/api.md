---
title: Sourceit — API Reference
description: API surface for @vielzeug/sourceit local and remote source models.
---

[[toc]]

## Package Entry Point

- `@vielzeug/sourceit`

## Core Factories

### createLocalSource

```ts
createLocalSource<T>(
  initialData: readonly T[],
  cfg?: {
    debounceMs?: number;
    filter?: (value: T, index: number, array: readonly T[]) => boolean;
    limit?: number;
    sort?: (a: T, b: T) => number;
  },
): LocalSource<T>
```

### createRemoteSource

```ts
createRemoteSource<T, F = unknown, S = unknown>(
  cfg: {
    debounceMs?: number;
    fetch: (q: {
      filter?: F;
      limit: number;
      page: number;
      search?: string;
      sort?: S;
    }) => Promise<{ items: readonly T[]; total: number }>;
    initialFilter?: F;
    initialSort?: S;
    limit?: number;
  },
): RemoteSource<T, F, S>
```

## Shared Source Shape

### Properties

- `current: readonly T[]`
- `meta: SourceMeta`

### Methods

- `subscribe(listener): () => void`
- `snapshot()`
- `fromQueryParams(params)`
- `toQueryParams()`
- `hydrate(state)`
- `update(mutator)`

## LocalSource Methods

- `flush()`
- `goTo(page)`
- `goToFirst()`
- `goToLast()`
- `next()`
- `prev()`
- `reset()`
- `search(query, immediate?)`
- `setData(data)`
- `setFilter(filter?)`
- `setLimit(limit)`
- `setSort(sort?)`

## RemoteSource Methods

- `flush()`
- `goTo(page)`
- `goToFirst()`
- `goToLast()`
- `next()`
- `prev()`
- `ready(): Promise<void>`
- `refresh()`
- `reset()`
- `search(query, immediate?)`
- `setFilter(filter?)`
- `setLimit(limit)`
- `setSort(sort?)`

## Utilities

### subscribeSelector

```ts
subscribeSelector<T, U>(
  source: BaseSource<T>,
  selector: (source: BaseSource<T>) => U,
  listener: (next: U, prev: U) => void,
  isEqual?: (a: U, b: U) => boolean,
): () => void
```

### Query Param Codecs

- `decodeLocalQueryParams(params, defaultLimit?)`
- `encodeLocalQueryParams(snapshot)`
- `decodeRemoteQueryParams(params, defaultLimit?)`
- `decodeRemoteQueryParamsStrict(params, defaultLimit?)`
- `encodeRemoteQueryParams(snapshot)`

### Predicate/Filter Helpers

- `and`, `or`, `not`
- `filterContains`, `filterEquals`, `filterRange`, `sortBy`

## Types

- `BaseSource<T>`
- `LocalSource<T>`
- `RemoteSource<T, F, S>`
- `SourceMeta`
- `SourceSnapshot`
- `RemoteSourceSnapshot<F, S>`
- `Predicate<T>`
- `Sorter<T>`
- `QueryParams`
- `QueryParamsInput`
