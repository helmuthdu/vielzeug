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

source.search('a', true);

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
    sort?: (a: T, b: T) => number;
  },
): LocalSource<T>
```

### `createRemoteSource`

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

## Shared Source Surface

Both local and remote sources expose:

- `current`
- `meta`
- `subscribe(listener)`
- `snapshot()`
- `hydrate(state)`
- `toQueryParams()`
- `fromQueryParams(params)`
- `update(mutator)`

Pagination/search/filter/sort methods are also aligned (`goTo`, `next`, `prev`, `setFilter`, `setSort`, `setLimit`, `search`, `reset`, `flush`).

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
