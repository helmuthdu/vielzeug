---
title: Sourcerer — API Reference
description: Complete API surface for @vielzeug/sourcerer.
---

[[toc]]

## API Overview

| Symbol                                 | Purpose                                                                                       | Execution mode | Common gotcha                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `createLocalSource()`                  | In-memory reactive collection with filter, sort, and search                                   | Sync           | Default `searchFn` JSON-stringifies each item for substring matching              |
| `createRemoteSource()`                 | Async server-backed collection with page navigation                                           | Async          | Fetches on creation; set `autoFetch: false` to delay                              |
| `createCursorSource()`                 | Async collection navigated by cursor tokens                                                   | Async          | `next()`/`prev()` are no-ops when the cursor is absent                            |
| `createInfiniteSource()`               | Async append-mode (infinite scroll) collection                                                | Async          | `loadMore()` is a no-op once `meta.hasMore` is `false`                            |
| `deriveSource()`                       | Create a reactive projection of another source                                                | Sync           | Derived source disposes automatically when parent disposes                        |
| `mergeSource()`                        | Combine multiple sources into one `MergedSource<T>`                                           | Sync           | No `meta` field — returned type is `MergedSource<T>`, not `ReactiveSource<T>`     |
| `applyQuery()`                         | Apply a partial query patch to any source with `patch()` — fires one fetch                    | Async          | Ignores `page` on Cursor/InfiniteSource — no page concept there                    |
| `SourcererError`                          | Base error class for all sourcerer errors; carries `message`, `cause`, `context`, `attempt`   | Class          | Extends `Error`; access context via getters, not object spread                    |
| `SourceTimeoutError`                   | Error thrown when `ready()` times out; has `timeoutMs` property                               | Class          | Extends `SourcererError`; also caught by `instanceof SourcererError`                    |
| `SourceDisposedError`                  | Error thrown by `ready()` when the source is disposed                                         | Class          | Extends `SourcererError`; catch separately from `SourceTimeoutError` if needed       |
| `sourceState()`                        | Derive a discriminated union (`loading`/`error`/`success`) from any source                    | Sync           | Returns `'loading'` when `isSearchPending` is true too                            |
| `itemRange()`                          | Compute 1-based display range from `SourceMeta`                                               | Sync           | Returns `{ start: 0, end: 0 }` when `totalItems === 0`                            |
| `prefetchSource()`                     | SSR: fetch first page, return serialisable snapshot; source is disposed immediately           | Async          | **Throws `SourcererError`** if fetch fails                                           |
| `prefetchSourceAndKeep()`              | SSR: fetch first page, return both snapshot and live source (no double-fetch)                 | Async          | Caller must call `source.dispose()` on the returned source                        |
| `filterContains()`                     | Preset predicate: case-insensitive substring match                                            | Sync           | Matches against a getter's string value                                           |
| `filterEquals()`                       | Preset predicate: strict equality match                                                       | Sync           | Uses `Object.is` semantics                                                        |
| `filterRange()`                        | Preset predicate: inclusive min/max range                                                     | Sync           | Works with numbers and Dates                                                      |
| `searchBy()`                           | Preset search builder: field-based matching for `LocalSourceConfig.searchFn`                  | Sync           | Prefer this over default JSON-stringify search on large collections               |
| `sortBy()`                             | Preset comparator: sort by a getter value                                                     | Sync           | Supports `'asc'` / `'desc'`; handles strings, numbers, Dates                      |
| `encodeQuery()`                        | Serialize source query to URL params                                                          | Sync           | Filter and sort are JSON-stringified                                              |
| `decodeQuery()`                        | Deserialize URL params (or `URLSearchParams`) to a source query                               | Sync           | Malformed JSON is silently dropped by default                                     |
| `FetchEvent<TQuery>`                   | Type for `onFetch` telemetry callbacks                                                        | Type           | —                                                                                 |
| `SearchOptions`                        | Options bag for `search()` — only field is `immediate?: boolean`                              | Type           | `search()` always returns `Promise<void>`; debounced unless `{ immediate: true }` |
| `DecodeQueryOptions`                   | Options for `decodeQuery()` — `defaultLimit` and `strict`                                     | Type           | `strict: true` throws on malformed JSON; default silently drops it                |

## Package Entry Point

| Import                | Purpose                |
| --------------------- | ---------------------- |
| `@vielzeug/sourcerer` | Main exports and types |

## Core Factories

### `createLocalSource`

```ts
createLocalSource<T>(
  initialData: readonly T[],
  cfg?: LocalSourceConfig<T>,
): LocalSource<T>
```

```ts
type LocalSourceConfig<T> = {
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

The default `searchFn` performs a case-insensitive JSON substring match — it stringifies each item with `JSON.stringify` and checks if the query string appears anywhere in the result. For better performance and intent clarity, prefer `searchBy(...)` when searching known fields.

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
  onFetch?: (event: FetchEvent<RemoteSourceQuery<TFilter, TSort>>) => void; // telemetry callback
  queryKey?: (q: RemoteSourceQuery<TFilter, TSort>) => string;
  refreshInterval?: number; // auto re-fetch every N ms; cancelled on dispose()
  retry?: RetryConfig;
  snapshot?: SourceSnapshot<T>; // pre-populate from SSR snapshot
  sort?: TSort;
  staleTime?: number; // skip re-fetch if same query key fetched within N ms (default: 0)
};
```

`queryKey` defaults to a stable JSON serialization with recursively sorted keys.
`staleTime` compares the **query key** — navigating to a different page always fetches even within the stale window. If an `optimisticUpdate()` is active, `refresh()` bypasses `staleTime` to settle the optimistic state.

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

| Method / Property      | Description                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispose()`            | Release internal resources; idempotent — safe to call multiple times                                                                                                                  |
| `disposed`             | `true` after `dispose()` has been called                                                                                                                                              |
| `disposalSignal`       | `AbortSignal` that is aborted when `dispose()` is called; useful for framework lifecycle hooks                                                                                        |
| `goTo(page)`           | Navigate to the given page number                                                                                                                                                     |
| `goToLast()`           | Navigate to the last page                                                                                                                                                             |
| `next()`               | Navigate to the next page (no-op at last page)                                                                                                                                        |
| `patch(changes)`       | Apply one or more query changes atomically — a single recompute for any combination of `limit`, `page`, `search`, `filter`, `sort`                                                    |
| `prev()`               | Navigate to the previous page (no-op at first page)                                                                                                                                   |
| `query`                | Current state as a `SourceQuery` (`limit`/`page`/`search` only — filter/sort aren't part of the query snapshot) — read-only snapshot; stable between changes                                                                                                   |
| `ready(timeout?)`      | Resolve when no async computation is pending and no debounce is scheduled; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError` |
| `reset()`              | Restore initial config and return to page 1                                                                                                                                           |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await immediately                                                             |
| `setData(data)`        | Replace the dataset and reset to page 1                                                                                                                                               |
| `subscribe(listener)`  | Subscribe to state changes; returns unsubscribe function                                                                                                                              |

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
| `query`                               | Current state as a `RemoteSourceQuery` — read-only snapshot; stable between changes                                                             |
| `ready(timeout?)`                     | Resolve when no requests are pending; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError` |
| `refresh()`                           | Re-fetch the current query                                                                                                                       |
| `reset()`                             | Restore initial config and refetch                                                                                                               |
| `search(query, opts?)`                | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await immediately                        |
| `subscribe(listener)`                 | Subscribe to state changes; returns unsubscribe function                                                                                         |

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
| `patch(changes)`       | Apply `limit` and/or `search` atomically — a single fetch; resets cursor position                                                    |
| `prev()`               | Go back using `prevCursor` (no-op if none)                                                                                             |
| `query`                | Current state as a `CursorSourceQuery` — read-only snapshot; stable between changes                                                   |
| `ready(timeout?)`      | Resolve when idle; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError`          |
| `refresh()`            | Re-fetch current cursor position                                                                                                       |
| `reset()`              | Clear cursors and fetch from the start                                                                                                 |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default; pass `{ immediate: true }` to cancel debounce and await. Resets cursor position. |
| `subscribe(listener)`  | Subscribe; returns unsubscribe                                                                                                         |

## `InfiniteSource<T>` Methods

| Method / Property      | Description                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispose()`            | Release internal resources; idempotent                                                                                                                          |
| `disposed`             | `true` after `dispose()` has been called                                                                                                                        |
| `disposalSignal`       | `AbortSignal` aborted when `dispose()` is called                                                                                                                |
| `loadMore()`           | Fetch the next page and append to `current` (no-op when `meta.hasMore === false`)                                                                               |
| `patch(changes)`       | Apply `limit` and/or `search` atomically — **clears items immediately** and fetches from page 1                                                                 |
| `query`                | Current state as an `InfiniteSourceQuery` — read-only snapshot; stable between changes                                                                         |
| `ready(timeout?)`      | Resolve when idle; rejects with `SourceDisposedError` if already disposed; optional timeout rejects with `SourceTimeoutError`                                   |
| `reset()`              | Clear accumulated items **immediately** and fetch from page 1                                                                                                   |
| `search(query, opts?)` | Always returns `Promise<void>`. Debounced by default — **clears items immediately**; fetch fires after debounce. Pass `{ immediate: true }` to skip the window. |
| `subscribe(listener)`  | Subscribe; returns unsubscribe                                                                                                                                  |

## Query Utilities

### `applyQuery`

```ts
applyQuery<T extends { patch(changes: Partial<SourceQuery>): Promise<void> }>(
  source: T,
  changes: Partial<SourceQuery>,
): Promise<void>
```

Applies a partial `SourceQuery` (`limit`/`page`/`search`) patch to any source that exposes a compatible `patch()` — delegates directly to `source.patch(changes)`. Fires a single fetch or recomputation for any combination of changed fields. No-op when `changes` is empty or all values are unchanged, per each source's own `patch()` implementation.

`CursorSource` and `InfiniteSource` have no page-number concept (keyset/append navigation) — their `patch()` only reads `limit`/`search`, so a `page` field from `decodeQuery()` output is silently ignored on those two source types.

**Example:**

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const q = decodeQuery(new URLSearchParams(location.search));
await applyQuery(source, q);
```

---

## Error Utilities

### `SourcererError`

```ts
class SourcererError extends Error {
  readonly name = 'SourcererError';
  get attempt(): number; // retry attempt that produced this error (0-based); defaults to 0
  get context(): SourcererErrorContext | undefined; // structured context bag — safe to log
  static is(err: unknown): err is SourcererError;
  // Also inherits: .message, .cause, .stack
}
```

Base class for all sourcerer errors. Thrown (and stored as `meta.error`) when a fetch fails. `cause` is the original thrown value. `SourceTimeoutError` and `SourceDisposedError` both extend this class, so a single `instanceof SourcererError` check covers all sourcerer errors.

### `SourceTimeoutError`

```ts
class SourceTimeoutError extends SourcererError {
  readonly name = 'SourceTimeoutError';
  readonly timeoutMs: number;
  // message: 'Source.ready() timed out after Nms'
}
```

Thrown by `ready(timeout)` when the timeout expires before the source becomes idle. Also caught by `instanceof SourcererError`.

### `SourceDisposedError`

```ts
class SourceDisposedError extends SourcererError {
  readonly name = 'SourceDisposedError';
  // message: 'Source disposed while waiting for ready()'
}
```

Thrown by `ready()` when the source is disposed before becoming idle. Also caught by `instanceof SourcererError`.

**Example:**

```ts
try {
  await prefetchSource({ fetch: fetchUsers, limit: 20 });
} catch (err) {
  if (SourcererError.is(err)) {
    console.error(err.message, err.context, err.cause);
  }
}
```

---

### `sourceState`

```ts
sourceState<T>(source: {
  readonly current: readonly T[];
  readonly meta: {
    readonly error: SourcererError | null;
    readonly isLoading: boolean;
    readonly isSearchPending?: boolean; // optional — treated as false when absent
  };
}): SourceState<T>
```

Derives a discriminated union from any source. Returns `'loading'` when either `isLoading` or `isSearchPending` is true — so callers see a spinner during the search debounce window as well as during network requests.

```ts
type SourceState<T> =
  | { readonly status: 'loading' }
  | { readonly error: SourcererError; readonly status: 'error' }
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
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
): Promise<SourceSnapshot<T>>
```

Fetches the first page server-side, then **disposes the internal source immediately** and returns a serialisable `SourceSnapshot`. **Throws `SourcererError`** if the fetch fails.

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
import { createRemoteSource, prefetchSource } from '@vielzeug/sourcerer';

// server.ts — fetch and discard the source:
const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });

// client.ts — start populated, no loading flash:
const source = createRemoteSource({ fetch: fetchUsers, limit: 20, snapshot });
```

---

### `prefetchSourceAndKeep`

```ts
prefetchSourceAndKeep<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }>
```

Fetches the first page and returns both a serialisable `SourceSnapshot` and the **still-live** `RemoteSource`. Use when you need the snapshot for SSR HTML serialisation **and** the live source for subsequent client-side updates — avoiding a double-fetch. **The caller is responsible for calling `source.dispose()`.**

**Example:**

```ts
import { prefetchSourceAndKeep } from '@vielzeug/sourcerer';

const { snapshot, source } = await prefetchSourceAndKeep({ fetch: fetchUsers, limit: 20 });
// embed snapshot in SSR HTML; hand source to client
// caller must dispose when done:
source.dispose();
```

## Codec Utilities

### `encodeQuery`

```ts
encodeQuery<TFilter, TSort>(
  query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
): QueryParams  // Record<string, string>
```

Serializes `filter` and `sort` as JSON when present. Omits `search` when absent.

> <ore-icon name="triangle-alert" size="16"></ore-icon> `filter` and `sort` are serialised with `JSON.stringify`, without a try/catch. A circular object reference throws a native `TypeError` ("Converting circular structure to JSON") straight out of `encodeQuery` — ensure filter/sort values are plain serialisable objects, or wrap the call yourself.
>
> `encodeQuery` and `decodeQuery` form a round-trip pair: `filter`/`sort` are JSON-stringified on encode and JSON-parsed on decode. Validate/narrow the decoded values before passing them to a source.

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
decodeQuery(
  params: QueryParamsInput | URLSearchParams,
  options?: { defaultLimit?: number; strict?: boolean },
): Partial<RemoteSourceQuery<unknown, unknown>>
```

Accepts either a `Record<string, string | string[] | undefined>` or a `URLSearchParams` instance directly.
Not generic — `filter`/`sort` on the result are always typed `unknown`. Narrow them with a runtime schema
(e.g. Zod) or an explicit cast before use, rather than trying to pass type arguments to `decodeQuery` itself.

- `defaultLimit` defaults to `20`.
- When `strict: false` (default), malformed `filter`/`sort` JSON is silently dropped.
- When `strict: true`, malformed JSON throws.
- `search` is omitted from the result when absent (no `search: ''` default).
- Array-valued params (`filter[]`, `sort[]`, etc.) use the first element, consistent with `search`.

**Example:**

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

// Pass URLSearchParams directly — filter/sort come back as `unknown`, narrow before use
const query = decodeQuery(new URLSearchParams(location.search), { defaultLimit: 20 });
await applyQuery(source, query);
```

## Types

```ts
type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
type Sorter<T> = (a: T, b: T) => number;

// search is OPTIONAL — omitted when no search is active
type SourceQuery = Readonly<{ limit: number; page: number; search?: string }>;

// Full set of fields patchable in one atomic recompute on a LocalSource
type LocalSourceQuery<T> = Partial<{
  filter: Predicate<T> | undefined;
  limit: number;
  page: number;
  search: string;
  sort: Sorter<T> | undefined;
}>;

type SourceMeta = Readonly<{
  error: SourcererError | null; // null when healthy
  isLoading: boolean;
  isSearchPending: boolean;
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;

type CursorMeta = Readonly<{
  error: SourcererError | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

type InfiniteMeta = Readonly<{
  error: SourcererError | null;
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
  | { readonly error: SourcererError; readonly status: 'error' }
  | { readonly items: readonly T[]; readonly status: 'success' };

// Discriminated union — narrow with `context.kind` to access the fields for that source type
type SourcererErrorContext =
  | Readonly<{ kind: 'cursor'; limit: number; search?: string }>
  | Readonly<{ kind: 'infinite'; limit: number; page: number; search?: string }>
  | Readonly<{ kind: 'remote'; limit: number; page: number; search?: string }>;

// Returned by deriveSource() — identical contract to ReactiveSource
type DerivedSource<T, TMeta = SourceMeta> = ReactiveSource<T, TMeta>;

type QueryParams = Record<string, string>;
type QueryParamsInput = Record<string, string | string[] | undefined>;

type DecodeQueryOptions = Readonly<{
  defaultLimit?: number; // default: 20
  strict?: boolean; // when true, throws on malformed filter/sort JSON; default: false
}>;

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

// PageNavigator — shared navigation interface for page-based sources (local and remote)
type PageNavigator<T> = ReactiveSource<T, SourceMeta> & {
  goTo(page: number): Promise<void>;
  goToLast(): Promise<void>;
  next(): Promise<void>;
  patch(changes: Partial<SourceQuery>): Promise<void>;
  prev(): Promise<void>;
  readonly query: SourceQuery;
  ready(timeout?: number): Promise<void>;
  reset(): Promise<void>;
  search(query: string, opts?: SearchOptions): Promise<void>;
};

// LocalSourceConfig — config passed to createLocalSource()
type LocalSourceConfig<T> = Readonly<{
  debounceMs?: number;           // default: 300
  filter?: Predicate<T>;
  filterAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
  initialData?: readonly T[];    // alternative to positional first arg
  limit?: number;                // default: 20
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
  sortAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
}>;

type FetchEvent<TQuery = unknown> = Readonly<{
  durationMs: number;
  error?: SourcererError; // only present when status === 'error'
  query: TQuery;
  status: 'error' | 'success';
}>;
```

## Errors

### `SourcererError`

See [Error Utilities > `SourcererError`](#sourcererror) above.

### `SourceTimeoutError`

```ts
class SourceTimeoutError extends SourcererError {
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
class SourceDisposedError extends SourcererError {
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
