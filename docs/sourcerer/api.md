---
title: Sourcerer — API Reference
description: Public API for @vielzeug/sourcerer.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `createLocalSource()` | In-memory search and pagination | Sync | Prepare filtering and ranking before `setData()` |
| `createPageSource()` | Numbered async pages | Async | `query` remains loaded state while `pendingQuery` is active |
| `createCursorSource()` | Cursor-based async pages | Async | `after` and `before` cannot coexist |
| `createInfiniteSource()` | Appended async pages | Async | `loadMore()` does nothing while fetching or exhausted |
| `SourceSnapshot` | Atomic loaded state plus pending request | Type | Read `pendingQuery` for newer in-flight state |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/sourcerer` | Factories and public types |

## Factories

### `createLocalSource()`

```ts
function createLocalSource<T>(data: readonly T[], config?: LocalSourceConfig<T>): LocalSource<T>
```

Creates a synchronous source over an in-memory collection.

| Option | Type | Description |
| --- | --- | --- |
| `initialQuery` | `LocalQueryPatch` | Initial page, page size, or search value |
| `match` | `(item, search) => boolean` | Explicit search predicate |

**Returns:** `LocalSource<T>`.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const users = createLocalSource(
  [{ id: 1, name: 'Ada' }],
  {
    initialQuery: { pageSize: 20 },
    match: (user, search) => user.name.toLowerCase().includes(search.toLowerCase()),
  },
);

users.setQuery({ search: 'ada' });
```

---

### `createPageSource()`

```ts
function createPageSource<T, TFilter = unknown, TSort = unknown>(
  config: PageSourceConfig<T, TFilter, TSort>,
): PageSource<T, TFilter, TSort>
```

Creates a numbered source. New queries abort older work. Loaded state stays in `snapshot`; newer work appears in `snapshot.pendingQuery`.

| Option | Type | Description |
| --- | --- | --- |
| `autoStart` | `boolean` | Start initial request; default `true` |
| `initialQuery` | `PageQueryPatch<TFilter, TSort>` | Initial query values |
| `load` | `(context) => Promise<PageResult<T>>` | Transport callback |

**Returns:** `PageSource<T, TFilter, TSort>`.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const users = createPageSource({
  autoStart: false,
  load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }),
});

await users.setQuery({ page: 1 });
users.dispose();
```

---

### `createCursorSource()`

```ts
function createCursorSource<T, TCursor = string>(
  config: CursorSourceConfig<T, TCursor>,
): CursorSource<T, TCursor>
```

Creates a sequential cursor source. Search and page-size changes reset cursors.

**Returns:** `CursorSource<T, TCursor>`.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const orders = createCursorSource({
  autoStart: false,
  load: async () => ({ data: ['order-1'] }),
});

await orders.reload();
await orders.page.next();
orders.dispose();
```

---

### `createInfiniteSource()`

```ts
function createInfiniteSource<T>(config: InfiniteSourceConfig<T>): InfiniteSource<T>
```

Creates an append-only source. Query changes replace loaded collection after successful first-page load.

**Returns:** `InfiniteSource<T>`.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const feed = createInfiniteSource({
  autoStart: false,
  load: async () => ({ data: ['post-1'], total: 1 }),
});

await feed.loadMore();
feed.dispose();
```

## Types

### Source primitives

```ts
type Disposable = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};

type SourceSnapshot<T, TQuery, TPagination extends AnyPagination = AnyPagination> = Readonly<{
  data: readonly T[];
  error: Error | null;
  isFetching: boolean;
  pagination: TPagination;
  pendingQuery?: TQuery;
  query: TQuery;
}>;

type Source<T, TQuery, TPagination extends AnyPagination = AnyPagination> = Disposable & {
  readonly snapshot: SourceSnapshot<T, TQuery, TPagination>;
  subscribe(listener: (snapshot: SourceSnapshot<T, TQuery, TPagination>) => void): () => void;
};
```

### Numbered pages

```ts
type PagePagination = Readonly<{
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
  index: number;
  kind: 'page';
  size: number;
  total: number;
}>;

type PageQuery<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter;
  page: number;
  pageSize: number;
  search: string;
  sort?: TSort;
}>;

type PageQueryPatch<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter | undefined;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: TSort | undefined;
}>;

type PageResult<T> = Readonly<{ data: readonly T[]; total: number }>;
type LoadContext<TQuery> = Readonly<{ query: TQuery; signal: AbortSignal }>;

type PageSourceConfig<T, TFilter = unknown, TSort = unknown> = Readonly<{
  autoStart?: boolean;
  initialQuery?: PageQueryPatch<TFilter, TSort>;
  load(context: LoadContext<PageQuery<TFilter, TSort>>): Promise<PageResult<T>>;
}>;

type PageSource<T, TFilter = unknown, TSort = unknown> = Source<T, PageQuery<TFilter, TSort>, PagePagination> & {
  readonly page: Readonly<{
    go(index: number): Promise<void>;
    last(): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
  }>;
  reload(): Promise<void>;
  setQuery(changes: PageQueryPatch<TFilter, TSort>): Promise<void>;
};
```

### Local sources

```ts
type LocalQuery = Readonly<{ page: number; pageSize: number; search: string }>;
type LocalQueryPatch = Readonly<{ page?: number; pageSize?: number; search?: string }>;
type LocalSourceConfig<T> = Readonly<{
  initialQuery?: LocalQueryPatch;
  match?: (item: T, search: string) => boolean;
}>;

type LocalSource<T> = Source<T, LocalQuery, PagePagination> & {
  readonly page: Readonly<{
    go(index: number): void;
    last(): void;
    next(): void;
    previous(): void;
  }>;
  setData(data: readonly T[]): void;
  setQuery(changes: LocalQueryPatch): void;
};
```

### Cursor and infinite sources

```ts
type CursorPagination<TCursor = string> = Readonly<{
  hasNext: boolean;
  hasPrevious: boolean;
  kind: 'cursor';
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  total?: number;
}>;

type CursorQuery<TCursor = string> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  pageSize: number;
  search: string;
}>;

type CursorQueryPatch<TCursor = string> = Readonly<{
  after?: TCursor | undefined;
  before?: TCursor | undefined;
  pageSize?: number;
  search?: string;
}>;

type CursorResult<T, TCursor = string> = Readonly<{
  data: readonly T[];
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  total?: number;
}>;

type CursorSourceConfig<T, TCursor = string> = Readonly<{
  autoStart?: boolean;
  initialQuery?: CursorQueryPatch<TCursor>;
  load(context: LoadContext<CursorQuery<TCursor>>): Promise<CursorResult<T, TCursor>>;
}>;

type CursorSource<T, TCursor = string> = Source<T, CursorQuery<TCursor>, CursorPagination<TCursor>> & {
  readonly page: Readonly<{ next(): Promise<void>; previous(): Promise<void> }>;
  reload(): Promise<void>;
  setQuery(changes: CursorQueryPatch<TCursor>): Promise<void>;
};

type InfinitePagination = Readonly<{
  hasMore: boolean;
  isLoadingMore: boolean;
  kind: 'infinite';
  loaded: number;
  total: number;
}>;

type InfiniteQuery = Readonly<{ pageSize: number; search: string }>;
type InfiniteQueryPatch = Readonly<{ pageSize?: number; search?: string }>;

type InfiniteSourceConfig<T> = Readonly<{
  autoStart?: boolean;
  initialQuery?: InfiniteQueryPatch;
  load(context: LoadContext<PageQuery>): Promise<PageResult<T>>;
}>;

type InfiniteSource<T> = Source<T, InfiniteQuery, InfinitePagination> & {
  loadMore(): Promise<void>;
  reload(): Promise<void>;
  setQuery(changes: InfiniteQueryPatch): Promise<void>;
};
```

### Shared helpers

```ts
type AnyPagination = CursorPagination<unknown> | InfinitePagination | PagePagination;
```
