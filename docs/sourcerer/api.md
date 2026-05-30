---
title: Sourcerer — API Reference
description: Complete API surface for @vielzeug/sourcerer.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
|---|---|---|---|
| `createLocalSource()` | In-memory reactive collection with filter, sort, and search | Sync (in-memory) | Default `searchFn` is fuzzy, not substring |
| `createRemoteSource()` | Async server-backed collection with page navigation | Async | Fetches on creation; set `autoFetch: false` to delay |
| `createCursorSource()` | Async collection navigated by cursor tokens | Async | `next()`/`prev()` are no-ops when the cursor is absent |
| `createInfiniteSource()` | Async append-mode (infinite scroll) collection | Async | `loadMore()` is a no-op once all items are loaded |
| `toSignals()` | Wrap a page-based source in Ripple computed signals | Sync | Must call `dispose()` or signals leak |
| `toCursorSignals()` | Wrap a cursor source in Ripple computed signals | Sync | Must call `dispose()` or signals leak |
| `toInfiniteSignals()` | Wrap an infinite source in Ripple computed signals | Sync | Returns `all`, not `current`; must call `dispose()` |
| `encodeQuery()` | Serialize source query to URL params | Sync | Filter and sort are JSON-stringified |
| `decodeQuery()` | Deserialize URL params to a source query | Sync | Malformed JSON is silently dropped by default |
| `filterContains()` | Predicate: field contains a string | Sync | Case-insensitive by default |
| `filterEquals()` | Predicate: value equals expected | Sync | Uses `===` — fails for object references |
| `filterRange()` | Predicate: number within bounds | Sync | Omitting both `min` and `max` matches everything |
| `sortBy()` | Sorter factory for a field | Sync | Ascending by default; pass `'desc'` explicitly |
| `and()`, `or()`, `not()` | Compose predicates | Sync | — |

## Package Entry Point

| Import | Purpose |
|---|---|
| `@vielzeug/sourcerer` | Main exports and types |

---

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
  debounceMs?: number;   // default: 300
  filter?: Predicate<T>;
  limit?: number;        // default: 10
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
};
```

The default `searchFn` uses fuzzy matching from `@vielzeug/arsenal`. Provide a custom `searchFn` to use exact substring matching or any other strategy.

**Returns:** `LocalSource<T>` — reactive in-memory source with pagination, filter, sort, and search.

**Example:**

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource([{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }], { limit: 1 });
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
  autoFetch?: boolean;   // default: true — fetches on creation
  debounceMs?: number;   // default: 300
  fetch: (
    q: { filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort },
    signal: AbortSignal,
  ) => Promise<{ items: readonly T[]; total: number }>;
  filter?: TFilter;
  limit?: number;        // default: 10
  queryKey?: (q: { filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }) => string;
  sort?: TSort;
};
```

`queryKey` defaults to a stable JSON serialization with recursively sorted keys. Override it for custom deduplication or caching keys.

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
  autoFetch?: boolean;   // default: true
  debounceMs?: number;   // default: 300
  fetch: (
    q: { after?: TCursor; before?: TCursor; limit: number; search?: string },
    signal: AbortSignal,
  ) => Promise<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>;
  limit?: number;        // default: 10
  queryKey?: (q: { after?: TCursor; before?: TCursor; limit: number; search?: string }) => string;
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
  autoFetch?: boolean;   // default: true
  debounceMs?: number;   // default: 300
  fetch: (
    q: { limit: number; page: number; search?: string },
    signal: AbortSignal,
  ) => Promise<{ items: readonly T[]; total: number }>;
  limit?: number;        // default: 10
};
```

**Returns:** `InfiniteSource<T>` — async append-mode source. Use `loadMore()` to add pages; read all accumulated items from `source.all`.

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
console.log(source.all.length, source.meta.hasMore);
```

---

## `LocalSource<T>` Methods

Extends `Source<T>`. All methods return `Promise<void>`.

| Method | Description |
|---|---|
| `commit()` | Flush pending debounced search and apply immediately |
| `goTo(page)` | Navigate to the given page number |
| `goToLast()` | Navigate to the last page |
| `next()` | Navigate to the next page (no-op at last page) |
| `prev()` | Navigate to the previous page (no-op at first page) |
| `reset()` | Restore initial config and return to page 1 |
| `restore(state)` | Apply a partial `SourceQuery` snapshot |
| `search(query)` | Debounced search — sets `meta.isSearchPending` until fired |
| `searchNow(query)` | Immediate search, cancels any pending debounce |
| `setData(data)` | Replace the dataset and reset to page 1 |
| `setFilter(filter?)` | Set or clear the filter predicate and reset to page 1 |
| `setLimit(limit)` | Set items per page and reset to page 1 |
| `setSort(sort?)` | Set or clear the sorter and reset to page 1 |
| `subscribe(listener)` | Subscribe to state changes; returns unsubscribe function |
| `toQuery()` | Return the current state as a `SourceQuery` |
| `update(patch)` | Atomically apply a partial query patch; no-op if nothing changed |

---

## `RemoteSource<T, TFilter, TSort>` Methods

All methods return `Promise<void>` except `optimisticUpdate` and `subscribe`.

| Method | Description |
|---|---|
| `commit()` | Flush pending debounced search |
| `goTo(page)` | Navigate to page and fetch |
| `goToLast()` | Navigate to the last page based on current `total` |
| `next()` | Next page (no-op at last page) |
| `optimisticUpdate(mutator, options?)` | Apply instant UI update; returns rollback function |
| `prev()` | Previous page (no-op at first page) |
| `ready()` | Resolve when no requests are pending and no debounce is active |
| `refresh()` | Re-fetch the current query |
| `reset()` | Restore initial config and refetch |
| `restore(state)` | Apply a partial `RemoteSourceQuery` snapshot and fetch if changed |
| `search(query)` | Debounced search |
| `searchNow(query)` | Immediate search |
| `setFilter(filter?)` | Set or clear the filter and fetch |
| `setLimit(limit)` | Set page size and fetch |
| `setSort(sort?)` | Set or clear the sort and fetch |
| `subscribe(listener)` | Subscribe to state changes; returns unsubscribe function |
| `toQuery()` | Return the current state as a `RemoteSourceQuery` |
| `update(patch)` | Atomically apply a partial query patch; no-op if nothing changed |

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

---

## `CursorSource<T>` Methods

| Method | Description |
|---|---|
| `next()` | Advance using `nextCursor` (no-op if none) |
| `prev()` | Go back using `prevCursor` (no-op if none) |
| `ready()` | Resolve when idle |
| `refresh()` | Re-fetch current cursor position |
| `reset()` | Clear cursors and fetch from the start |
| `search(query)` | Debounced search (resets cursor position) |
| `searchNow(query)` | Immediate search (resets cursor position) |
| `setLimit(limit)` | Set page size (resets cursor position) |
| `subscribe(listener)` | Subscribe; returns unsubscribe |

---

## `InfiniteSource<T>` Methods

| Method | Description |
|---|---|
| `loadMore()` | Fetch the next page and append to `all` (no-op when fully loaded) |
| `ready()` | Resolve when idle |
| `reset()` | Clear accumulated items and fetch from page 1 |
| `search(query)` | Debounced search (resets accumulator) |
| `searchNow(query)` | Immediate search (resets accumulator) |
| `setLimit(limit)` | Set page size and restart from page 1 |
| `subscribe(listener)` | Subscribe; returns unsubscribe |

---

## Signal Adapters

### `toSignals`

```ts
toSignals<T>(source: BaseSource<T>): {
  current: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<SourceMeta>;
}
```

Wraps a page-based local or remote source. `current` and `meta` are `ComputedSignal` — they update automatically when the source changes.

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

---

### `toCursorSignals`

```ts
toCursorSignals<T>(source: CursorSource<T>): {
  current: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<CursorMeta>;
}
```

**Returns:** Object with `current`, `meta`, and `dispose`.

---

### `toInfiniteSignals`

```ts
toInfiniteSignals<T>(source: InfiniteSource<T>): {
  all: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<InfiniteMeta>;
}
```

**Returns:** Object with `all` (not `current`), `meta`, and `dispose`.

`dispose()` unsubscribes from the source, disposes both computed signals, and disposes the internal tick signal.

---

## Codec Utilities

### `encodeQuery`

```ts
encodeQuery<TFilter, TSort>(
  query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
): QueryParams  // Record<string, string>
```

Serializes `filter` and `sort` as JSON when present. Omits empty `search`.

**Returns:** `QueryParams` — flat `Record<string, string>` suitable for `new URLSearchParams()`.

**Example:**

```ts
import { encodeQuery } from '@vielzeug/sourcerer';

const params = encodeQuery({ page: 2, limit: 20, search: 'ada', filter: { role: 'admin' }, sort: undefined });
// { page: '2', limit: '20', search: 'ada', filter: '{"role":"admin"}' }
new URLSearchParams(params).toString();
```

---

### `decodeQuery`

```ts
decodeQuery<TFilter, TSort>(
  params: QueryParamsInput,  // Record<string, string | string[] | undefined>
  options?: { defaultLimit?: number; strict?: boolean },
): Partial<RemoteSourceQuery<TFilter, TSort>>
```

- `defaultLimit` defaults to `10`.
- When `strict: false` (default), malformed `filter`/`sort` JSON is silently dropped.
- When `strict: true`, malformed JSON throws.

**Returns:** `Partial<RemoteSourceQuery<TFilter, TSort>>` — pass directly to `source.restore()`.

**Example:**

```ts
import { decodeQuery } from '@vielzeug/sourcerer';

const params = Object.fromEntries(new URLSearchParams(location.search));
const query = decodeQuery<Filter, Sort>(params, { defaultLimit: 20 });
await source.restore(query);
```

---

## Predicate and Sort Helpers

### `filterContains`

```ts
filterContains<T>(
  getValue: (item: T) => string | null | undefined,
  query: string,
  caseSensitive?: boolean,  // default: false
): Predicate<T>
```

**Returns:** `Predicate<T>` — true when the field contains `query` (case-insensitive by default).

**Example:**

```ts
import { createLocalSource, filterContains } from '@vielzeug/sourcerer';

const source = createLocalSource(users, { limit: 10 });
await source.setFilter(filterContains((u) => u.name, 'ada'));
```

---

### `filterEquals`

```ts
filterEquals<T, V>(getValue: (item: T) => V, expected: V): Predicate<T>
```

**Returns:** `Predicate<T>` — true when `getValue(item) === expected`.

---

### `filterRange`

```ts
filterRange<T>(
  getValue: (item: T) => number,
  bounds: { min?: number; max?: number },
): Predicate<T>
```

**Returns:** `Predicate<T>` — true when the numeric field is within `[min, max]`. Both bounds are optional.

---

### `sortBy`

```ts
sortBy<T, V extends number | string | Date>(
  getValue: (item: T) => V,
  direction?: 'asc' | 'desc',  // default: 'asc'
): Sorter<T>
```

**Returns:** `Sorter<T>` — comparator function suitable for `Array.prototype.sort`.

**Example:**

```ts
import { sortBy } from '@vielzeug/sourcerer';

await source.setSort(sortBy((u) => u.name, 'desc'));
```

---

### `and`, `or`, `not`

```ts
and<T>(...predicates: Predicate<T>[]): Predicate<T>
or<T>(...predicates: Predicate<T>[]): Predicate<T>
not<T>(predicate: Predicate<T>): Predicate<T>
```

**Returns:** `Predicate<T>` — composed predicate.

**Example:**

```ts
import { and, filterContains, filterRange } from '@vielzeug/sourcerer';

await source.setFilter(
  and(
    filterContains((u) => u.name, 'a'),
    filterRange((u) => u.age, { min: 18 }),
  ),
);
```

---

## Types

```ts
type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
type Sorter<T> = (a: T, b: T) => number;

type SourceQuery = Readonly<{ limit: number; page: number; search: string }>;

type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = SourceQuery &
  Readonly<{ filter?: TFilter; sort?: TSort }>;

type SourceMeta = Readonly<{
  errorMessage: string | null;
  isLoading: boolean;
  isSearchPending: boolean;
  itemEnd: number;
  itemStart: number;
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;

type CursorMeta = Readonly<{
  errorMessage: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

type InfiniteMeta = Readonly<{
  errorMessage: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

type BaseSource<T> = {
  readonly current: readonly T[];
  readonly meta: SourceMeta;
  subscribe(listener: () => void): () => void;
};

type QueryParams = Record<string, string>;
type QueryParamsInput = Record<string, string | string[] | undefined>;
```
