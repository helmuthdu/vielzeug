---
title: Sourcerer — API Reference
description: Complete API surface for @vielzeug/sourcerer.
---

[[toc]]

## API At a Glance

| Symbol                       | Purpose                                                                    | Common gotcha                                                  |
| ---------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `createLocalSource()`        | In-memory reactive collection with filter, sort, and search                | Default `searchFn` is fuzzy, not substring                     |
| `createRemoteSource()`       | Async server-backed collection with page navigation                        | Fetches on creation; set `autoFetch: false` to delay           |
| `createCursorSource()`       | Async collection navigated by cursor tokens                                | `next()`/`prev()` are no-ops when the cursor is absent         |
| `createInfiniteSource()`     | Async append-mode (infinite scroll) collection                             | `loadMore()` is a no-op once `meta.hasMore` is `false`         |
| `deriveSource()`             | Create a reactive projection of another source                             | Derived source disposes automatically when parent disposes     |
| `mergeSource()`              | Combine multiple sources into one reactive source                          | All sources must share the same item type                      |
| `toSignals()`                | Wrap any source in Ripple computed signals                                 | Must call `dispose()` or signals leak                          |
| `SourceError`                | Structured error class with `message`, `cause`, `query`, `attempt`         | Extends `Error`; access context via getters, not object spread |
| `SourceTimeoutError`         | Error thrown when `ready()` times out                                      | Extends `Error`; check with `instanceof SourceTimeoutError`    |
| `sourceState()`              | Derive a discriminated union (`loading`/`error`/`success`) from any source | —                                                              |
| `itemRange()`                | Compute 1-based display range from `SourceMeta`                            | Returns `{ start: 0, end: 0 }` when `totalItems === 0`         |
| `prefetchSource()`           | SSR: fetch first page, return serialisable snapshot                        | **Throws `SourceError`** if fetch fails                        |
| `prefetchSourceWithSource()` | SSR: fetch first page, return both snapshot and live source                | Caller must call `source.dispose()`                            |
| `composeFetch()`             | Layer middleware around a `fetch`-shaped function                          | Middlewares execute left-to-right (first = outermost)          |
| `filterContains()`           | Preset predicate: case-insensitive substring match                         | Matches against a getter's string value                        |
| `filterEquals()`             | Preset predicate: strict equality match                                    | Uses `Object.is` semantics                                     |
| `filterRange()`              | Preset predicate: inclusive min/max range                                  | Works with numbers and Dates                                   |
| `sortBy()`                   | Preset comparator: sort by a getter value                                  | Supports `'asc'` / `'desc'`; handles strings, numbers, Dates   |
| `encodeQuery()`              | Serialize source query to URL params                                       | Filter and sort are JSON-stringified                           |
| `decodeQuery()`              | Deserialize URL params (or `URLSearchParams`) to a source query            | Malformed JSON is silently dropped by default                  |

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

The default `searchFn` uses fuzzy matching from `@vielzeug/arsenal`. Provide a custom `searchFn` to use exact substring matching or any other strategy.

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
await source.searchNow('ad');
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
  onFetch?: (event: FetchEvent<TFilter, TSort>) => void; // telemetry callback
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
): CursorSource<T>
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
  queryKey?: (q: CursorSourceQuery<TCursor>) => string;
};
```

**Returns:** `CursorSource<T>` — async source navigated by opaque cursor tokens instead of page numbers.

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

| Method                | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `dispose()`           | Release internal resources                                                                       |
| `flush()`             | Flush pending debounced search and apply immediately                                             |
| `goTo(page)`          | Navigate to the given page number                                                                |
| `goToLast()`          | Navigate to the last page                                                                        |
| `restoreQuery(state)` | Apply a partial `SourceQuery` snapshot; no-op if nothing changed                                 |
| `next()`              | Navigate to the next page (no-op at last page)                                                   |
| `prev()`              | Navigate to the previous page (no-op at first page)                                              |
| `ready(timeout?)`     | Resolve when no async computation is pending; optional timeout rejects with `SourceTimeoutError` |
| `reset()`             | Restore initial config and return to page 1                                                      |
| `search(query)`       | Debounced search — sets `meta.isSearchPending` until fired                                       |
| `searchNow(query)`    | Immediate search, cancels any pending debounce                                                   |
| `setData(data)`       | Replace the dataset and reset to page 1                                                          |
| `setFilter(filter?)`  | Set or clear the filter predicate and reset to page 1                                            |
| `setLimit(limit)`     | Set items per page and reset to page 1                                                           |
| `setSort(sort?)`      | Set or clear the sorter and reset to page 1                                                      |
| `subscribe(listener)` | Subscribe to state changes; returns unsubscribe function                                         |
| `toQuery()`           | Return the current state as a `SourceQuery`                                                      |

## `RemoteSource<T, TFilter, TSort>` Methods

All methods return `Promise<void>` except `optimisticUpdate` and `subscribe`.

| Method                                | Description                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dispose()`                           | Release internal resources, cancel pending requests and refresh interval                                           |
| `flush()`                             | Flush pending debounced search                                                                                     |
| `goTo(page)`                          | Navigate to page and fetch                                                                                         |
| `goToLast()`                          | Navigate to the last page based on current `total`                                                                 |
| `restoreQuery(state)`                 | Apply a partial `RemoteSourceQuery` snapshot and fetch if changed                                                  |
| `next()`                              | Next page (no-op at last page)                                                                                     |
| `optimisticUpdate(mutator, options?)` | Apply instant UI update; returns rollback function                                                                 |
| `prev()`                              | Previous page (no-op at first page)                                                                                |
| `ready(timeout?)`                     | Resolve when no requests are pending and no debounce is active; optional timeout rejects with `SourceTimeoutError` |
| `refresh()`                           | Re-fetch the current query                                                                                         |
| `reset()`                             | Restore initial config and refetch                                                                                 |
| `search(query)`                       | Debounced search                                                                                                   |
| `searchNow(query)`                    | Immediate search                                                                                                   |
| `setFilter(filter?)`                  | Set or clear the filter and fetch                                                                                  |
| `setLimit(limit)`                     | Set page size and fetch                                                                                            |
| `setSort(sort?)`                      | Set or clear the sort and fetch                                                                                    |
| `subscribe(listener)`                 | Subscribe to state changes; returns unsubscribe function                                                           |
| `toQuery()`                           | Return the current state as a `RemoteSourceQuery`                                                                  |

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

## `CursorSource<T>` Methods

| Method                | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `dispose()`           | Release internal resources                                             |
| `flush()`             | Flush pending debounced search                                         |
| `next()`              | Advance using `nextCursor` (no-op if none)                             |
| `prev()`              | Go back using `prevCursor` (no-op if none)                             |
| `ready(timeout?)`     | Resolve when idle; optional timeout                                    |
| `refresh()`           | Re-fetch current cursor position                                       |
| `reset()`             | Clear cursors and fetch from the start                                 |
| `restoreQuery(patch)` | Apply a partial `CursorSourceQuery` snapshot; no-op if nothing changed |
| `search(query)`       | Debounced search (resets cursor position)                              |
| `searchNow(query)`    | Immediate search (resets cursor position)                              |
| `setLimit(limit)`     | Set page size (resets cursor position)                                 |
| `subscribe(listener)` | Subscribe; returns unsubscribe                                         |
| `toQuery()`           | Return the current state as a `CursorSourceQuery`                      |

## `InfiniteSource<T>` Methods

| Method                | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `dispose()`           | Release internal resources                                                        |
| `flush()`             | Flush pending debounced search                                                    |
| `loadMore()`          | Fetch the next page and append to `current` (no-op when `meta.hasMore === false`) |
| `ready(timeout?)`     | Resolve when idle; optional timeout                                               |
| `reset()`             | Clear accumulated items and fetch from page 1                                     |
| `search(query)`       | Debounced search (resets accumulator)                                             |
| `searchNow(query)`    | Immediate search (resets accumulator)                                             |
| `setLimit(limit)`     | Set page size and restart from page 1                                             |
| `subscribe(listener)` | Subscribe; returns unsubscribe                                                    |
| `toQuery()`           | Return the current state as an `InfiniteSourceQuery`                              |

## Signal Adapter

### `toSignals`

```ts
toSignals<T, TMeta>(source: ReactiveSource<T, TMeta>): {
  current: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<TMeta>;
}
```

Works with all four source types — local, remote, cursor, and infinite. `current` and `meta` are `ComputedSignal` — they update automatically when the source changes.

**Returns:** Object with `current`, `meta`, and `dispose`.

**Example:**

```ts
import { effect } from '@vielzeug/ripple';
import { toSignals } from '@vielzeug/sourcerer';

const { current, meta, dispose } = toSignals(source);
effect(() => console.log(meta.value.pageNumber, current.value.length));
// later
dispose();
```

> `dispose()` unsubscribes from the source, disposes both computed signals, and releases the internal tick signal.

## Error Utilities

### `SourceError`

```ts
class SourceError extends Error {
  readonly name = 'SourceError';
  get attempt(): number; // retry attempt that produced this error (0-based)
  get query(): unknown; // query that triggered the failure
  // Also inherits: .message, .cause, .stack
}
```

Thrown (and stored as `meta.error`) when a fetch fails. `cause` is the original thrown value.

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
  readonly meta: { readonly error: SourceError | null; readonly isLoading: boolean };
}): SourceState<T>
```

Derives a discriminated union from any source:

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
prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): Promise<SourceSnapshot<T>>
```

Fetches the first page server-side and returns a serialisable `SourceSnapshot`. **Throws `SourceError`** if the fetch fails.

```ts
type SourceSnapshot<T> = Readonly<{
  items: readonly T[];
  page: number;
  search?: string;
  total: number;
}>;
```

**Example:**

```ts
import { prefetchSource } from '@vielzeug/sourcerer';

// server.ts
const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });

// client.ts
const source = createRemoteSource({ fetch: fetchUsers, limit: 20, snapshot });
```

---

### `prefetchSourceWithSource`

```ts
prefetchSourceWithSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }>
```

Like `prefetchSource` but also returns the live source so subsequent fetches do not double-request page 1. **Throws `SourceError`** if the fetch fails. Caller is responsible for calling `source.dispose()`.

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

**Example:**

```ts
import { decodeQuery } from '@vielzeug/sourcerer';

// Pass URLSearchParams directly
const query = decodeQuery<Filter, Sort>(new URLSearchParams(location.search), { defaultLimit: 20 });
await source.restoreQuery(query);
```

## Pagination Utilities

### `itemRange`

See [Error Utilities > `itemRange`](#itemrange) above.

## Types

```ts
type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
type Sorter<T> = (a: T, b: T) => number;

// search is OPTIONAL — omitted when no search is active
type SourceQuery = Readonly<{ limit: number; page: number; search?: string }>;

type RemoteFetchQuery<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter;
  limit: number;
  page: number;
  search?: string;
  sort?: TSort;
}>;

// Alias of RemoteFetchQuery — the shape returned by toQuery() on RemoteSource
type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = RemoteFetchQuery<TFilter, TSort>;

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
  readonly meta: TMeta;
  subscribe(listener: () => void): () => void;
};

type SourceState<T> =
  | { readonly status: 'loading' }
  | { readonly error: SourceError; readonly status: 'error' }
  | { readonly items: readonly T[]; readonly status: 'success' };

type QueryParams = Record<string, string>;
type QueryParamsInput = Record<string, string | string[] | undefined>;

type SourceSnapshot<T> = Readonly<{
  items: readonly T[];
  page: number;
  search?: string;
  total: number;
}>;

type RetryConfig = {
  attempts: number;
  delay?: number | ((attempt: number) => number);
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
class SourceTimeoutError extends Error {
  readonly name = 'SourceTimeoutError';
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
