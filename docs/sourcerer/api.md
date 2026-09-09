---
title: Sourcerer — API Reference
description: Public API for @vielzeug/sourcerer.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createLocalSource()` | Filter and paginate in-memory items | Sync | `params` replacement uses `Object.is` |
| `createPageSource()` | Load numbered pages | Async | Construction is inert |
| `createCursorSource()` | Load server-issued cursor pages | Async | `after` and `before` cannot coexist initially |
| `createInfiniteSource()` | Append numbered pages | Async | `loadMore()` is a no-op while loading or exhausted |
| `SourcererError` | Base package error | Sync | Loader errors retain their original type |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/sourcerer` | All factories, states, pagination types, loader contexts, and errors |

## Source Factories

### `createLocalSource()`

```ts
function createLocalSource<T>(items: readonly T[]): LocalSource<T>
function createLocalSource<T, TParams = undefined>(
  items: readonly T[],
  config: LocalSourceConfig<T, TParams>,
): LocalSource<T, TParams>
```

Returns a synchronous in-memory source.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | `readonly T[]` | Initial collection |
| `config.filter` | `(item: T, params: TParams) => boolean` | Optional inclusion predicate |
| `config.pageSize` | `number` | Positive page size; defaults to `20` |
| `config.params` | `TParams` | Initial params; required when `TParams` excludes `undefined` |

**Returns:** `LocalSource<T, TParams>`.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(['Ada', 'Grace'], {
  filter: (name, search: string) => name.includes(search),
  params: '',
});
source.setParams('Ada');
```

| Method | Returns | Description |
| --- | --- | --- |
| `first()` | `void` | Move to page one |
| `goTo(page)` | `void` | Move to a positive page, clamped to the known range |
| `last()` | `void` | Move to the final page |
| `next()` | `void` | Move forward when available |
| `previous()` | `void` | Move backward when available |
| `setItems(items)` | `void` | Replace the collection and recompute state |
| `setPageSize(pageSize)` | `void` | Replace page size and reset to page one |
| `setParams(params)` | `void` | Replace params and reset to page one |
| `subscribe(listener)` | `() => void` | Register a state listener and return its unsubscribe function |
| `dispose()` | `void` | Stop notifications and reject later mutations |

---

### `createPageSource()`

```ts
function createPageSource<T, TParams = undefined>(
  config: PageSourceConfig<T, TParams>,
): PageSource<T, TParams>
```

Returns an inert numbered-page source.

| Parameter | Type | Description |
| --- | --- | --- |
| `config.load` | `(context: PageLoadContext<TParams>) => Promise<PageResult<T>>` | Page loader |
| `config.pageSize` | `number` | Positive page size; defaults to `20` |
| `config.params` | `TParams` | Initial params; required when `TParams` excludes `undefined` |

**Returns:** `PageSource<T, TParams>`.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({
  load: async ({ page }) => ({ items: [page], totalItems: 10 }),
});
await source.reload();
```

| Method | Returns | Description |
| --- | --- | --- |
| `first()` | `Promise<void>` | Load page one |
| `goTo(page)` | `Promise<void>` | Load a positive page |
| `last()` | `Promise<void>` | Load the last known page |
| `next()` | `Promise<void>` | Load the next known page |
| `previous()` | `Promise<void>` | Load the previous page |
| `reload()` | `Promise<void>` | Reload the requested page and params |
| `setPageSize(pageSize)` | `Promise<void>` | Reset to page one and load with a new size |
| `setParams(params)` | `Promise<void>` | Reset to page one and load replacement params |
| `subscribe(listener)` | `() => void` | Register a state listener and return its unsubscribe function |
| `dispose()` | `void` | Abort work and stop notifications |

---

### `createCursorSource()`

```ts
function createCursorSource<T, TParams = undefined, TCursor = string>(
  config: CursorSourceConfig<T, TParams, TCursor>,
): CursorSource<T, TParams, TCursor>
```

Returns an inert cursor source.

| Parameter | Type | Description |
| --- | --- | --- |
| `config.after` | `TCursor` | Optional initial forward cursor |
| `config.before` | `TCursor` | Optional initial backward cursor |
| `config.load` | `(context: CursorLoadContext<TParams, TCursor>) => Promise<CursorResult<T, TCursor>>` | Cursor loader |
| `config.pageSize` | `number` | Positive page size; defaults to `20` |
| `config.params` | `TParams` | Initial params; required when `TParams` excludes `undefined` |

**Returns:** `CursorSource<T, TParams, TCursor>`.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const source = createCursorSource({ load: async () => ({ items: ['first'], nextCursor: 'next' }) });
await source.reload();
await source.next();
```

| Method | Returns | Description |
| --- | --- | --- |
| `next()` | `Promise<void>` | Load `state.pagination.nextCursor` when available |
| `previous()` | `Promise<void>` | Load `state.pagination.previousCursor` when available |
| `reload()` | `Promise<void>` | Reload the requested cursor and params |
| `setPageSize(pageSize)` | `Promise<void>` | Clear cursors and reload with a new size |
| `setParams(params)` | `Promise<void>` | Clear cursors and load replacement params |
| `subscribe(listener)` | `() => void` | Register a state listener and return its unsubscribe function |
| `dispose()` | `void` | Abort work and stop notifications |

---

### `createInfiniteSource()`

```ts
function createInfiniteSource<T, TParams = undefined>(
  config: InfiniteSourceConfig<T, TParams>,
): InfiniteSource<T, TParams>
```

Returns an inert source that appends numbered pages.

| Parameter | Type | Description |
| --- | --- | --- |
| `config.load` | `(context: InfiniteLoadContext<TParams>) => Promise<PageResult<T>>` | Page loader |
| `config.pageSize` | `number` | Positive page size; defaults to `20` |
| `config.params` | `TParams` | Initial params; required when `TParams` excludes `undefined` |

**Returns:** `InfiniteSource<T, TParams>`.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const source = createInfiniteSource({ load: async () => ({ items: ['post'], totalItems: 1 }) });
await source.reload();
await source.loadMore();
```

| Method | Returns | Description |
| --- | --- | --- |
| `loadMore()` | `Promise<void>` | Append the next page when available |
| `reload()` | `Promise<void>` | Replace items from page one |
| `setPageSize(pageSize)` | `Promise<void>` | Replace items from page one with a new size |
| `setParams(params)` | `Promise<void>` | Replace items from page one with new params |
| `subscribe(listener)` | `() => void` | Register a state listener and return its unsubscribe function |
| `dispose()` | `void` | Abort work and stop notifications |

## Types

### Page source types

```ts
type PagePagination = Readonly<{
  hasNext: boolean;
  hasPrevious: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
}>;

type PageSourceState<T, TParams = undefined> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: PagePagination;
  params: TParams;
  pendingParams?: TParams;
}>;

type PageLoadContext<TParams = undefined> = Readonly<{
  page: number;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

type PageResult<T> = Readonly<{
  items: readonly T[];
  totalItems: number;
}>;

type PageSourceConfig<T, TParams = undefined> = Readonly<{
  load(context: PageLoadContext<TParams>): Promise<PageResult<T>>;
  pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

type PageSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  first(): Promise<void>;
  goTo(page: number): Promise<void>;
  last(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: PageSourceState<T, TParams>;
  subscribe(listener: (state: PageSourceState<T, TParams>) => void): () => void;
};
```

The conditional config field makes `params` optional only when `TParams` includes `undefined`.

### Local source types

```ts
type LocalSourceState<T, TParams = undefined> = Readonly<{
  error: null;
  items: readonly T[];
  loading: false;
  pagination: PagePagination;
  params: TParams;
}>;

type LocalSourceConfig<T, TParams = undefined> = Readonly<{
  filter?: (item: T, params: TParams) => boolean;
  pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

type LocalSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  first(): void;
  goTo(page: number): void;
  last(): void;
  next(): void;
  previous(): void;
  setItems(items: readonly T[]): void;
  setPageSize(pageSize: number): void;
  setParams(params: TParams): void;
  readonly state: LocalSourceState<T, TParams>;
  subscribe(listener: (state: LocalSourceState<T, TParams>) => void): () => void;
};
```

### Cursor source types

```ts
type CursorPagination<TCursor = string> = Readonly<{
  nextCursor?: TCursor;
  pageSize: number;
  previousCursor?: TCursor;
  totalItems?: number;
}>;

type CursorLoadContext<TParams = undefined, TCursor = string> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

type CursorResult<T, TCursor = string> = Readonly<{
  items: readonly T[];
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  totalItems?: number;
}>;

type CursorSourceState<T, TParams = undefined, TCursor = string> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: CursorPagination<TCursor>;
  params: TParams;
  pendingParams?: TParams;
}>;

type CursorSourceConfig<T, TParams = undefined, TCursor = string> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  load(context: CursorLoadContext<TParams, TCursor>): Promise<CursorResult<T, TCursor>>;
  pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

type CursorSource<T, TParams = undefined, TCursor = string> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  next(): Promise<void>;
  previous(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: CursorSourceState<T, TParams, TCursor>;
  subscribe(listener: (state: CursorSourceState<T, TParams, TCursor>) => void): () => void;
};
```

### Infinite source types

```ts
type InfinitePagination = Readonly<{
  hasMore: boolean;
  loadedItems: number;
  pageSize: number;
  totalItems: number;
}>;

type InfiniteLoadContext<TParams = undefined> = Readonly<{
  page: number;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

type InfiniteSourceState<T, TParams = undefined> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: InfinitePagination;
  params: TParams;
  pendingParams?: TParams;
}>;

type InfiniteSourceConfig<T, TParams = undefined> = Readonly<{
  load(context: InfiniteLoadContext<TParams>): Promise<PageResult<T>>;
  pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

type InfiniteSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  loadMore(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: InfiniteSourceState<T, TParams>;
  subscribe(listener: (state: InfiniteSourceState<T, TParams>) => void): () => void;
};
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `SourcererError` | Base class for package-originated configuration and lifecycle errors | `instanceof SourcererError` narrows the hierarchy |
| `SourcererConfigurationError` | Invalid page, page size, total, or initial cursor direction | Extends `SourcererError` |
| `SourcererDisposedError` | A source command runs after disposal | Extends `SourcererError` |

Loader failures are preserved when they are `Error` instances. Non-Error rejections become `Error` objects whose `cause` contains the original value.
