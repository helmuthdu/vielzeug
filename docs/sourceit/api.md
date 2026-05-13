---
title: Sourceit — API Reference
description: API surface for @vielzeug/sourceit local and remote source models.
---

[[toc]]

## Package Entry Point

| Import                 | Purpose                |
| ---------------------- | ---------------------- |
| `@vielzeug/sourceit`   | Main exports and types |

## API At a Glance

| Symbol                  | Purpose                                        | Execution mode | Common gotcha                                           |
| ----------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------- |
| `createLocalSource()`   | Create a reactive in-memory data store         | Sync           | Data is not persisted — use Deposit for persistence     |
| `createRemoteSource()`  | Create a reactive remote data fetcher          | Async          | Requires a fetch adapter function                       |
| `source.get()`          | Read current data or fetch on first access     | Sync/Async     | Returns `undefined` before first load                   |
| `source.set()`          | Update the local data snapshot                 | Sync           | Notifies all subscribers immediately                    |
| `source.refresh()`      | Re-fetch from remote                           | Async          | Triggers loading state during re-fetch                  |
| `source.subscribe()`    | Subscribe to data changes                      | Sync           | Returns unsubscribe function — call on component destroy |

## Core Factories

### createLocalSource

```ts
createLocalSource<T>(
  initialData: readonly T[],
  cfg?: {
    debounceMs?: number;
    filter?: (value: T, index: number, array: readonly T[]) => boolean;
    limit?: number;
    searchFn?: (items: readonly T[], query: string) => readonly T[];
    sort?: (a: T, b: T) => number;
  },
): LocalSource<T>
```

### createRemoteSource

```ts
createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: {
    debounceMs?: number;
    fetch: (q: {
      filter?: TFilter;
      limit: number;
      page: number;
      search?: string;
      sort?: TSort;
    }) => Promise<{ items: readonly T[]; total: number }>;
    filter?: TFilter;
    limit?: number;
    sort?: TSort;
  },
): RemoteSource<T, TFilter, TSort>
```

## Shared Source Shape

### Properties

- `current: readonly T[]`
- `meta: SourceMeta`

### Methods

- `subscribe(listener): () => void`
- `toQuery()`
- `fromQueryParams(params)`
- `restore(state)`
- `batch(mutator)`

## LocalSource Methods

- `commit()`
- `goTo(page)`
- `goToLast()`
- `next()`
- `prev()`
- `reset()`
- `search(query)`
- `searchNow(query)`
- `setData(data)`
- `setFilter(filter?)`
- `setLimit(limit)`
- `setSort(sort?)`

## RemoteSource Methods

- `commit()`
- `goTo(page)`
- `goToLast()`
- `next()`
- `prev()`
- `ready(): Promise<void>`
- `refresh()`
- `reset()`
- `search(query)`
- `searchNow(query)`
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
- `encodeLocalQueryParams(query)`
- `decodeRemoteQueryParams(params, defaultLimit?)`
- `decodeRemoteQueryParamsStrict(params, defaultLimit?)`
- `encodeRemoteQueryParams(query)`

### Predicate/Filter Helpers

- `and`, `or`, `not`
- `filterContains`, `filterEquals`, `filterRange`, `sortBy`

## Types

- `BaseSource<T>`
- `LocalSource<T>`
- `RemoteSource<T, TFilter, TSort>`
- `SourceMeta`
- `SourceQuery`
- `RemoteSourceQuery<TFilter, TSort>`
- `Predicate<T>`
- `Sorter<T>`
- `QueryParams`
- `QueryParamsInput`
