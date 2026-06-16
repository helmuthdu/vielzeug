---
title: Sourcerer — API Reference
description: Complete API surface for @vielzeug/sourcerer.
---

[[toc]]

## API At a Glance

| Symbol                                 | Purpose                                                                                     | Execution mode | Common gotcha                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `createLocalSource()`                  | In-memory reactive collection with filter, sort, and search                                 | Sync           | Default `searchFn` is fuzzy, not substring                                        |
| `createRemoteSource()`                 | Async server-backed collection with page navigation                                         | Async          | Fetches on creation; set `autoFetch: false` to delay                              |
| `createCursorSource()`                 | Async collection navigated by cursor tokens                                                 | Async          | `next()`/`prev()` are no-ops when the cursor is absent                            |
| `createInfiniteSource()`               | Async append-mode (infinite scroll) collection                                              | Async          | `loadMore()` is a no-op once `meta.hasMore` is `false`                            |
| `deriveSource()`                       | Create a reactive projection of another source                                              | Sync           | Derived source disposes automatically when parent disposes                        |
| `mergeSource()`                        | Combine multiple sources into one `MergedSource<T>`                                         | Sync           | No `meta` field — returned type is `MergedSource<T>`, not `ReactiveSource<T>`     |
| `applyQuery()`                         | Apply a partial query patch to any source with `patch()` — fires one fetch                  | Async          | Delegates directly to `source.patch(changes)`                                     |
| `applyLocalQuery()`                    | Typed wrapper: apply `Partial<SourceQuery>` to a `LocalSource`                              | Async          | Delegates to `source.patch()`                                                     |
| `applyRemoteQuery()`                   | Typed wrapper: apply `Partial<RemoteSourceQuery>` to a `RemoteSource`                       | Async          | Delegates to `source.patch()`                                                     |
| `applyCursorQuery()`                   | Typed wrapper: apply limit/search patch to a `CursorSource`                                 | Async          | Delegates to `source.patch()`                                                     |
| `applyInfiniteQuery()`                 | Typed wrapper: apply limit/search patch to an `InfiniteSource`                              | Async          | Delegates to `source.patch()`                                                     |
| `SourceError`                          | Base error class for all sourcerer errors; carries `message`, `cause`, `context`, `attempt` | Class          | Extends `Error`; access context via getters, not object spread                    |
| `SourceTimeoutError`                   | Error thrown when `ready()` times out; has `timeoutMs` property                             | Class          | Extends `SourceError`; also caught by `instanceof SourceError`                    |
| `SourceDisposedError`                  | Error thrown by `ready()` when the source is disposed                                       | Class          | Extends `SourceError`; catch separately from `SourceTimeoutError` if needed       |
| `sourceState()`                        | Derive a discriminated union (`loading`/`error`/`success`) from any source                  | Sync           | Returns `'loading'` when `isSearchPending` is true too                            |
| `itemRange()`                          | Compute 1-based display range from `SourceMeta`                                             | Sync           | Returns `{ start: 0, end: 0 }` when `totalItems === 0`                            |
| `prefetchSource()`                     | SSR: fetch first page, return serialisable snapshot                                         | Async          | **Throws `SourceError`** if fetch fails                                           |
| `prefetchSource({ keepSource: true })` | SSR: fetch first page, return both snapshot and live source                                 | Async          | Caller must call `source.dispose()` on the returned source                        |
| `composeFetch()`                       | Layer middleware around a `fetch`-shaped function                                           | Sync           | Middlewares execute left-to-right (first = outermost)                             |
| `filterContains()`                     | Preset predicate: case-insensitive substring match                                          | Sync           | Matches against a getter's string value                                           |
| `filterEquals()`                       | Preset predicate: strict equality match                                                     | Sync           | Uses `Object.is` semantics                                                        |
| `filterRange()`                        | Preset predicate: inclusive min/max range                                                   | Sync           | Works with numbers and Dates                                                      |
| `sortBy()`                             | Preset comparator: sort by a getter value                                                   | Sync           | Supports `'asc'` / `'desc'`; handles strings, numbers, Dates                      |
| `encodeQuery()`                        | Serialize source query to URL params                                                        | Sync           | Filter and sort are JSON-stringified                                              |
| `decodeQuery()`                        | Deserialize URL params (or `URLSearchParams`) to a source query                             | Sync           | Malformed JSON is silently dropped by default                                     |
| `FetchEvent<TQuery>`                   | Type for `onFetch` telemetry callbacks                                                      | Type           | —                                                                                 |
| `SearchOptions`                        | Options bag for `search()` — only field is `immediate?: boolean`                            | Type           | `search()` always returns `Promise<void>`; debounced unless `{ immediate: true }` |

## Package Entry Point

| Import                | Purpose                |
| --------------------- | ---------------------- |
| `@vielzeug/sourcerer` | Main exports and types |

## Core Factories

### `createLocalSource`

```ts
createLocalSource<T>(
  initialData: readonly T[],
  cfg?: LocalConfig<T>,
): LocalSource<T>
```

```ts
type LocalConfig<T> = {
  debounceMs?: number; // default: 300
  initialData?: readonly T[]; // alternative to positional data arg; takes precedence when both are provided
  filter?: Predicate<T>;
  filterAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
  limit?: number; // default: 20
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
  sortAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
};
```

The default `searchFn` performs a case-insensitive JSON substring match — i.e. it stringifies each item with `JSON.stringify` and checks if the query string appears anywhere in the result. Provide a custom `searchFn` for domain-specific relevance or exact field matching.

`filterAsync` and `sortAsync` run after their synchronous counterparts. They set `meta.isLoading = true` during computation and accept an `AbortSignal` — a new call aborts any running async computation.

**Returns:** `LocalSource<T>` — reactive in-memory source with pagination, filter, sort, and search.

**Example:**

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
  ],
  { limit: 1 },
);
await source.search('ad', { immediate: true });
console.log(source.current); // [{ id: 1, name: 'Ada' }]
```

---

### `createRemoteSource`

```ts
createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): RemoteSource<T, TFilter, TSort>
```

```ts
type RemoteConfig<T, TFilter, TSort> = {
  autoFetch?: boolean; // default: true — fetches on creation
  debounceMs?: number; // default: 300
  fetch: (
    q: { filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort },
    signal: AbortSignal,
  ) => Promise<{ items: readonly T[]; total: number }>;
  filter?: TFilter;
  limit?: number; // default: 20
  onFetch?: (event: FetchEvent<RemoteFetchQuery<TFilter, TSort>>) => void; // telemetry callback
  queryKey?: (q: RemoteSourceQuery<TFilter, TSort>) => string;
  refreshInterval?: number; // auto re-fetch every N ms; cancelled on dispose()
  retry?: RetryConfig;
  snapshot?: SourceSnapshot<T>; // pre-populate from SSR snapshot
  sort?: TSort;
  staleTime?: number; // skip re-fetch if same query key fetched within N ms (default: 0)
};
```

`queryKey` defaults to a stable JSON serialization with recursively sorted keys.
`staleTime` compares the **query key** — navigating to a different page always fetches even within the stale window.

**Returns:** `RemoteSource<T, TFilter, TSort>` — async server-backed source with page navigation and optimistic update support.

**Example:**

```ts
import { createRemoteSource } from '@vielzeug/sourcerer';

const source = createRemoteSource({
  fetch: async ({ limit, page }, signal) => {
    const res = await fetch(`/api/items?page=${page}&limit=${limit}`, { signal });
    return res.json();
  },
  limit: 20,
  staleTime: 5000,
});
await source.ready();
```

---

### `createCursorSource`

```ts
createCursorSource<T, TCursor = string>(
  cfg: CursorConfig<T, TCursor>,
): CursorSource<T, TCursor>
```

```ts
type CursorConfig<T, TCursor = string> = {
  autoFetch?: boolean; // default: true
  debounceMs?: number; // default: 300
  fetch: (
    q: { after?: TCursor; before?: TCursor; limit: number; search?: string },
    signal: AbortSignal,
  ) => Promise<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>;
  limit?: number; // default: 20
  onFetch?: (event: FetchEvent<CursorSourceQuery<TCursor>>) => void;
  queryKey?: (q: CursorSourceQuery<TCursor>) => string;
  refreshInterval?: number; // auto re-fetch every N ms; cancelled on dispose()
  retry?: RetryConfig;
};
```

**Returns:** `CursorSource<T, TCursor>` — async source navigated by opaque cursor tokens instead of page numbers.

**Example:**

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const source = createCursorSource({
  fetch: async ({ after, limit }, signal) => {
    const res = await fetch(`/api/items?after=${after ?? ''}&limit=${limit}`, { signal });
    return res.json(); // { items, nextCursor, prevCursor, total }
  },
  limit: 20,
});
await source.ready();
if (source.meta.hasNextPage) await source.next();
```

---

### `createInfiniteSource`

```ts
createInfiniteSource<T>(cfg: InfiniteConfig<T>): InfiniteSource<T>
```

```ts
type InfiniteConfig<T> = {
  autoFetch?: boolean; // default: true
  debounceMs?: number; // default: 300
  fetch: (q: InfiniteSourceQuery, signal: AbortSignal) => Promise<{ items: readonly T[]; total: number }>;
  limit?: number; // default: 20
  onFetch?: (event: FetchEvent<InfiniteSourceQuery>) => void;
  queryKey?: (q: InfiniteSourceQuery) => string; // custom deduplication key
  refreshInterval?: number;
  retry?: RetryConfig;
};
```

**Returns:** `InfiniteSource<T>` — async append-mode source. Use `loadMore()` to add pages; read all accumulated items from `source.current`.

**Example:**

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const source = createInfiniteSource({
  fetch: async ({ limit, page }, signal) => {
    const res = await fetch(`/api/posts?page=${page}&limit=${limit}`, { signal });
    return res.json();
  },
  limit: 20,
});
await source.ready();
await source.loadMore(); // appends page 2
console.log(source.current.length, source.meta.hasMore);
```

## `LocalSource<T>` Methods

All methods return `Promise<void>` unless noted.

| Method / Property      | Description                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispose()`            | Release internal resources; idempotent — safe to call multiple times                                                                                     |
| `disposed`             | `true` after `dispose()` has been called                                                                                                                 |
| `disposalSignal`       | `AbortSignal` that is aborted when `dispose()` is called; useful for framework lifecycle hooks                                                           |
| `goTo(page)`           | Navigate to the given page number                                                                                                                        |
| `goToLast()`           | Navigate to the last page                                                                                                                                |
| `next()`               | Navigate to the next page (no-op at last page)                                                                                                           |
| `patch(changes)`       | Apply one or more query changes atomically — a single recompute for any combination of `limit`, `page`, `search`                                         |
| `prev()`               | Navigate to the previous page (no-op at first page)                                                                                                      |
| `ready(timeout?)`      | Resolve when no async computation is pending; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError` |
| `reset()`              | Restore initial config and return to page 1                                                                                                              |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await immediately                                |
| `setData(data)`        | Replace the dataset and reset to page 1                                                                                                                  |
| `setFilter(filter?)`   | Set or clear the filter predicate and reset to page 1                                                                                                    |
| `setLimit(limit)`      | Set items per page and reset to page 1                                                                                                                   |
| `setSort(sort?)`       | Set or clear the sorter and reset to page 1                                                                                                              |
| `subscribe(listener)`  | Subscribe to state changes; returns unsubscribe function                                                                                                 |
| `toQuery()`            | Return the current state as a `SourceQuery`                                                                                                              |

## `RemoteSource<T, TFilter, TSort>` Methods

All methods return `Promise<void>` except `optimisticUpdate` and `subscribe`.

| Method / Property                     | Description                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dispose()`                           | Release internal resources, cancel pending requests and refresh interval; idempotent                                                             |
| `disposed`                            | `true` after `dispose()` has been called                                                                                                         |
| `disposalSignal`                      | `AbortSignal` aborted when `dispose()` is called                                                                                                 |
| `goTo(page)`                          | Navigate to page and fetch                                                                                                                       |
| `goToLast()`                          | Navigate to the last page based on current `total`                                                                                               |
| `next()`                              | Next page (no-op at last page)                                                                                                                   |
| `optimisticUpdate(mutator, options?)` | Apply instant UI update; returns rollback function                                                                                               |
| `patch(changes)`                      | Apply one or more query changes atomically — a single fetch for any combination of `limit`, `page`, `search`, `filter`, `sort`                   |
| `prev()`                              | Previous page (no-op at first page)                                                                                                              |
| `ready(timeout?)`                     | Resolve when no requests are pending; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError` |
| `refresh()`                           | Re-fetch the current query                                                                                                                       |
| `reset()`                             | Restore initial config and refetch                                                                                                               |
| `search(query, opts?)`                | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await immediately                        |
| `setFilter(filter?)`                  | Set or clear the filter and fetch                                                                                                                |
| `setLimit(limit)`                     | Set page size and fetch                                                                                                                          |
| `setSort(sort?)`                      | Set or clear the sort and fetch                                                                                                                  |
| `subscribe(listener)`                 | Subscribe to state changes; returns unsubscribe function                                                                                         |
| `toQuery()`                           | Return the current state as a `RemoteSourceQuery`                                                                                                |

### `optimisticUpdate`

```ts
optimisticUpdate(
  mutator: (current: readonly T[]) => readonly T[],
  options?: { total?: number },
): () => void  // returns rollback function
```

- Applies `mutator` to the current items immediately.
- The returned rollback function is a **no-op** once the next successful fetch has settled.
- On fetch failure, state is restored to the pre-optimistic items (not empty).
- Only one optimistic update can be active at a time — a second call throws.
- If `mutator` throws, the optimistic state is **not applied** and no `rollback` is needed — the source remains in its pre-update state.

## `CursorSource<T>` Methods

| Method / Property      | Description                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `dispose()`            | Release internal resources; idempotent                                                                                                 |
| `disposed`             | `true` after `dispose()` has been called                                                                                               |
| `disposalSignal`       | `AbortSignal` aborted when `dispose()` is called                                                                                       |
| `next()`               | Advance using `nextCursor` (no-op if none)                                                                                             |
| `patch(changes)`       | Apply `limit` and/or `search` atomically — a single fetch                                                                              |
| `prev()`               | Go back using `prevCursor` (no-op if none)                                                                                             |
| `ready(timeout?)`      | Resolve when idle; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError`          |
| `refresh()`            | Re-fetch current cursor position                                                                                                       |
| `reset()`              | Clear cursors and fetch from the start                                                                                                 |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await. Resets cursor position. |
| `setLimit(limit)`      | Set page size (resets cursor position)                                                                                                 |
| `subscribe(listener)`  | Subscribe; returns unsubscribe                                                                                                         |
| `toQuery()`            | Return the current state as a `CursorSourceQuery`                                                                                      |

## `InfiniteSource<T>` Methods

| Method / Property      | Description                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispose()`            | Release internal resources; idempotent                                                                                                                          |
| `disposed`             | `true` after `dispose()` has been called                                                                                                                        |
| `disposalSignal`       | `AbortSignal` aborted when `dispose()` is called                                                                                                                |
| `loadMore()`           | Fetch the next page and append to `current` (no-op when `meta.hasMore === false`)                                                                               |
| `patch(changes)`       | Apply `limit` and/or `search` atomically — **clears items immediately** and fetches from page 1                                                                 |
| `ready(timeout?)`      | Resolve when idle; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError`                                   |
| `reset()`              | Clear accumulated items **immediately** and fetch from page 1                                                                                                   |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default — **clears items immediately**; fetch fires after debounce. Pass `{ immediate: true }` to skip the window. |
| `setLimit(limit)`      | Set page size — **clears items immediately** and restarts from page 1                                                                                           |
| `subscribe(listener)`  | Subscribe; returns unsubscribe                                                                                                                                  |
| `toQuery()`            | Return the current state as an `InfiniteSourceQuery`                                                                                                            |

## Query Utilities

### `applyQuery`

```ts
applyQuery<TChanges extends Record<string, unknown>>(
  source: { patch(changes: Partial<TChanges>): Promise<void> },
  changes: Partial<TChanges>,
): Promise<void>
```

Applies a partial query patch to any source that exposes `patch()`. Fires a single fetch or recomputation for any combination of changed fields. No-op when `changes` is empty or all values are unchanged.

**Example:**

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const q = decodeQuery(new URLSearchParams(location.search));
await applyQuery(source, q);
```

---

### `applyLocalQuery`

```ts
applyLocalQuery<T>(
  source: LocalSource<T>,
  changes: Partial<SourceQuery>,
): Promise<void>
```

Typed wrapper for `applyQuery` — applies `Partial<SourceQuery>` to a `LocalSource` via `source.patch()`.

---

### `applyRemoteQuery`

```ts
applyRemoteQuery<T, TFilter, TSort>(
  source: RemoteSource<T, TFilter, TSort>,
  changes: Partial<RemoteSourceQuery<TFilter, TSort>>,
): Promise<void>
```

Typed wrapper for `applyQuery` — applies `Partial<RemoteSourceQuery>` to a `RemoteSource` via `source.patch()`. Fires a single fetch covering all changed fields.

**Example:**

```ts
import { applyRemoteQuery, decodeQuery } from '@vielzeug/sourcerer';

const q = decodeQuery<MyFilter, MySort>(new URLSearchParams(location.search));
await applyRemoteQuery(source, q);
```

---

### `applyCursorQuery`

```ts
applyCursorQuery<TCursor>(
  source: { patch(changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>): Promise<void> },
  changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>,
): Promise<void>
```

Typed wrapper for `applyQuery` — applies `limit` and/or `search` to a `CursorSource` via `source.patch()`.

---

### `applyInfiniteQuery`

```ts
applyInfiniteQuery(
  source: { patch(changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>): Promise<void> },
  changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>,
): Promise<void>
```

Typed wrapper for `applyQuery` — applies `limit` and/or `search` to an `InfiniteSource` via `source.patch()`. Clears accumulated items and restarts from page 1.

---

## Error Utilities

### `SourceError`

```ts
class SourceError extends Error {
  readonly name = 'SourceError';
  get attempt(): number; // retry attempt that produced this error (0-based)
  get context(): SourceErrorContext | undefined; // structured context object
  // Also inherits: .message, .cause, .stack
}
```

Base class for all sourcerer errors. Thrown (and stored as `meta.error`) when a fetch fails. `cause` is the original thrown value. `SourceTimeoutError` and `SourceDisposedError` both extend this class, so a single `instanceof SourceError` check covers all sourcerer errors.

### `SourceTimeoutError`

```ts
class SourceTimeoutError extends SourceError {
  readonly name = 'SourceTimeoutError';
  readonly timeoutMs: number;
  // message: 'Source.ready() timed out after Nms'
}
```

Thrown by `ready(timeout)` when the timeout expires before the source becomes idle. Also caught by `instanceof SourceError`.

### `SourceDisposedError`

```ts
class SourceDisposedError extends SourceError {
  readonly name = 'SourceDisposedError';
  // message: 'Source disposed while waiting for ready()'
}
```

Thrown by `ready()` when the source is disposed before becoming idle. Also caught by `instanceof SourceError`.

**Example:**

```ts
try {
  await prefetchSource({ fetch: fetchUsers, limit: 20 });
} catch (err) {
  if (err instanceof SourceError) {
    console.error(err.message, err.query, err.cause);
  }
}
```

---

### `sourceState`

```ts
sourceState<T>(source: {
  readonly current: readonly T[];
  readonly meta: {
    readonly error: SourceError | null;
    readonly isLoading: boolean;
    readonly isSearchPending?: boolean; // optional — treated as false when absent
  };
}): SourceState<T>
```

Derives a discriminated union from any source. Returns `'loading'` when either `isLoading` or `isSearchPending` is true — so callers see a spinner during the search debounce window as well as during network requests.

```ts
type SourceState<T> =
  | { readonly status: 'loading' }
  | { readonly error: SourceError; readonly status: 'error' }
  | { readonly items: readonly T[]; readonly status: 'success' };
```

**Example:**

```ts
import { sourceState } from '@vielzeug/sourcerer';

const state = sourceState(source);
switch (state.status) {
  case 'loading':
    return renderSpinner();
  case 'error':
    return renderError(state.error.message);
  case 'success':
    return renderList(state.items);
}
```

---

### `itemRange`

```ts
itemRange(meta: Readonly<{
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>): { end: number; start: number }
```

Computes 1-based display item numbers. Returns `{ start: 0, end: 0 }` when `totalItems === 0`.

**Example:**

```ts
import { itemRange } from '@vielzeug/sourcerer';

const { start, end } = itemRange(source.meta);
// page 2 of 20 per page, 150 total -> { start: 21, end: 40 }
console.log(`Showing ${start}–${end} of ${source.meta.totalItems}`);
```

## SSR Prefetch

### `prefetchSource`

```ts
// Snapshot only:
prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
  opts?: { keepSource?: false },
): Promise<SourceSnapshot<T>>

// Snapshot + live source (no double-fetch):
prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
  opts: { keepSource: true },
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }>
```

Fetches the first page server-side and returns a serialisable `SourceSnapshot`. **Throws `SourceError`** if the fetch fails. Pass `{ keepSource: true }` to also get back the still-live source — useful when you need the snapshot for SSR serialisation **and** the live source for subsequent client-side updates without a double-fetch. The caller is responsible for calling `source.dispose()` when using `keepSource: true`.

```ts
type SourceSnapshot<T> = Readonly<{
  items: readonly T[];
  page?: number; // optional — absent means page 1
  search?: string;
  total: number;
}>;
```

**Example:**

```ts
import { prefetchSource } from '@vielzeug/sourcerer';

// Snapshot only (server.ts):
const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });

// client.ts — start populated, no loading flash:
const source = createRemoteSource({ fetch: fetchUsers, limit: 20, snapshot });
```

```ts
// Snapshot + live source (no double-fetch):
const { snapshot, source } = await prefetchSource({ fetch: fetchUsers, limit: 20 }, { keepSource: true });
// caller must dispose when done:
source.dispose();
```

## Fetch Middleware

### `composeFetch`

```ts
composeFetch<TQuery, TResult>(
  base: (q: TQuery, signal: AbortSignal) => Promise<TResult>,
  ...middlewares: FetchMiddleware<TQuery, TResult>[],
): (q: TQuery, signal: AbortSignal) => Promise<TResult>
```

```ts
type FetchMiddleware<TQuery = unknown, TResult = unknown> = (
  q: TQuery,
  signal: AbortSignal,
  next: (q: TQuery, signal: AbortSignal) => Promise<TResult>,
) => Promise<TResult>;
```

Middlewares execute left-to-right (first = outermost wrapper).

**Example:**

```ts
import { composeFetch } from '@vielzeug/sourcerer';
import type { FetchMiddleware } from '@vielzeug/sourcerer';

const logging: FetchMiddleware = async (q, signal, next) => {
  console.log('fetch', q);
  const result = await next(q, signal);
  console.log('done', q);
  return result;
};

const source = createRemoteSource({
  fetch: composeFetch(baseFetch, logging),
  limit: 20,
});
```

## Codec Utilities

### `encodeQuery`

```ts
encodeQuery<TFilter, TSort>(
  query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
): QueryParams  // Record<string, string>
```

Serializes `filter` and `sort` as JSON when present. Omits `search` when absent.

> <sg-icon name="triangle-alert" size="16"></sg-icon> `filter` and `sort` are serialised with `stableStringify`. Circular object references will cause a stack overflow — ensure filter/sort values are plain serialisable objects.

**Example:**

```ts
import { encodeQuery } from '@vielzeug/sourcerer';

const params = encodeQuery({ page: 2, limit: 20, search: 'ada', filter: { role: 'admin' } });
// { page: '2', limit: '20', search: 'ada', filter: '{"role":"admin"}' }
new URLSearchParams(params).toString();
```

---

### `decodeQuery`

```ts
decodeQuery<TFilter, TSort>(
  params: QueryParamsInput | URLSearchParams,
  options?: { defaultLimit?: number; strict?: boolean },
): Partial<RemoteSourceQuery<TFilter, TSort>>
```

Accepts either a `Record<string, string | string[] | undefined>` or a `URLSearchParams` instance directly.

- `defaultLimit` defaults to `20`.
- When `strict: false` (default), malformed `filter`/`sort` JSON is silently dropped.
- When `strict: true`, malformed JSON throws.
- `search` is omitted from the result when absent (no `search: ''` default).
- Array-valued params (`filter[]`, `sort[]`, etc.) use the first element, consistent with `search`.

**Example:**

```ts
import { applyRemoteQuery, decodeQuery } from '@vielzeug/sourcerer';

// Pass URLSearchParams directly
const query = decodeQuery<Filter, Sort>(new URLSearchParams(location.search), { defaultLimit: 20 });
await applyRemoteQuery(source, query);
```

## Types

```ts
type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
type Sorter<T> = (a: T, b: T) => number;

// search is OPTIONAL — omitted when no search is active
type SourceQuery = Readonly<{ limit: number; page: number; search?: string }>;

type SourceMeta = Readonly<{
  error: SourceError | null; // null when healthy
  isLoading: boolean;
  isSearchPending: boolean;
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;

type CursorMeta = Readonly<{
  error: SourceError | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

type InfiniteMeta = Readonly<{
  error: SourceError | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean; // true only during loadMore() — not during reset()
  isSearchPending: boolean;
  loadedPages: number; // number of pages currently accumulated in current[]
  pageSize: number;
  totalItems: number;
}>;

type ReactiveSource<T, TMeta> = {
  readonly current: readonly T[];
  readonly disposalSignal: AbortSignal; // aborted when dispose() is called
  dispose(): void;
  readonly disposed: boolean;
  readonly meta: TMeta;
  subscribe(listener: () => void): () => void;
  [Symbol.dispose](): void;
};

// Returned by mergeSource() — has no meta because parent sources may have different meta shapes
type MergedSource<T> = {
  readonly current: readonly T[];
  readonly disposalSignal: AbortSignal; // aborted when dispose() is called
  dispose(): void;
  readonly disposed: boolean;
  subscribe(listener: () => void): () => void;
  [Symbol.dispose](): void;
};

type SourceState<T> =
  | { readonly status: 'loading' }
  | { readonly error: SourceError; readonly status: 'error' }
  | { readonly items: readonly T[]; readonly status: 'success' };

type QueryParams = Record<string, string>;
type QueryParamsInput = Record<string, string | string[] | undefined>;

type SourceSnapshot<T> = Readonly<{
  items: readonly T[];
  page?: number; // optional — absent means page 1
  search?: string;
  total: number;
}>;

type RetryConfig = {
  attempts?: number; // default: 0 (no retries)
  delay?: (attempt: number) => number; // default: exponential backoff
};

type FetchEvent<TQuery = unknown> = Readonly<{
  durationMs: number;
  error?: SourceError; // only present when status === 'error'
  query: TQuery;
  status: 'error' | 'success';
}>;
```

## Errors

### `SourceError`

See [Error Utilities > `SourceError`](#sourceerror) above.

### `SourceTimeoutError`

```ts
class SourceTimeoutError extends SourceError {
  readonly name = 'SourceTimeoutError';
  readonly timeoutMs: number;
  // message: 'Source.ready() timed out after Nms'
}
```

Thrown by `ready(timeout)` when the source has not become idle within the specified `timeout` milliseconds. Check with `instanceof SourceTimeoutError` for typed catch blocks:

```ts
import { SourceTimeoutError } from '@vielzeug/sourcerer';

try {
  await source.ready(5000);
} catch (err) {
  if (err instanceof SourceTimeoutError) {
    console.warn('Source did not load in time:', err.message);
  }
}
```

### `SourceDisposedError`

```ts
class SourceDisposedError extends SourceError {
  readonly name = 'SourceDisposedError';
  // message: 'Source disposed while waiting for ready()'
}
```

Thrown by `ready()` when `dispose()` is called on the source while a `ready()` call is still pending. Use `instanceof SourceDisposedError` to distinguish it from `SourceTimeoutError`:

```ts
import { SourceDisposedError, SourceTimeoutError } from '@vielzeug/sourcerer';

try {
  await source.ready(5000);
} catch (err) {
  if (err instanceof SourceDisposedError) {
    // source was torn down — skip cleanup
  } else if (err instanceof SourceTimeoutError) {
    console.warn('timed out');
  }
}
```
