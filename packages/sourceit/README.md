# @vielzeug/sourceit

![Sourceit Logo](../../docs/public/logo-sourceit.svg)

Reactive, typed local and remote query sources for list-like UIs.

- Local in-memory sources via `createLocalSource`
- Remote async sources via `createRemoteSource`
- Shared pagination/filter/sort/search behavior
- URL query param encode/decode helpers
- Selector subscriptions via `subscribeSelector`

## Installation

```sh
pnpm add @vielzeug/sourceit
```

## Quick Start

```ts
import { createLocalSource } from '@vielzeug/sourceit';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  { limit: 2 },
);

source.searchNow('a');

console.log(source.current);
console.log(source.meta.pageNumber);
```

## Core APIs

### `createLocalSource`

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

### `createRemoteSource`

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

## Shared Source Surface

Both local and remote sources expose:

- `current`
- `meta`
- `subscribe(listener)`
- `toQuery()`
- `fromQueryParams(params)`
- `restore(state)`
- `batch(mutator)`

Pagination/search/filter/sort methods are also aligned (`goTo`, `goToLast`, `next`, `prev`, `setFilter`, `setSort`, `setLimit`, `search`, `searchNow`, `reset`, `commit`).

Remote sources additionally provide:

- `refresh()`
- `ready(): Promise<void>`

## URL Query Param Helpers

```ts
import {
  decodeLocalQueryParams,
  decodeRemoteQueryParams,
  decodeRemoteQueryParamsStrict,
  encodeLocalQueryParams,
  encodeRemoteQueryParams,
} from '@vielzeug/sourceit';
```

## Selector Subscriptions

```ts
import { subscribeSelector } from '@vielzeug/sourceit';

const stop = subscribeSelector(
  source,
  (s) => s.meta.pageNumber,
  (next, prev) => {
    console.log('page changed', prev, '->', next);
  },
);

stop();
```

## Development

```sh
pnpm --filter @vielzeug/sourceit test
pnpm --filter @vielzeug/sourceit build
```

## Docs

- Package docs: [vielzeug.dev/sourceit](https://vielzeug.dev/sourceit/)
- Usage guide: [vielzeug.dev/sourceit/usage](https://vielzeug.dev/sourceit/usage)
- API reference: [vielzeug.dev/sourceit/api](https://vielzeug.dev/sourceit/api)
