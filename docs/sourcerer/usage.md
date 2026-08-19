---
title: Sourcerer — Usage Guide
description: Build local, page, cursor, and infinite collection sources.
---

[[toc]]

## Basic Usage

Use a local source when data already exists in memory.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  {
    initialQuery: { pageSize: 2 },
    match: (user, search) => user.name.toLowerCase().includes(search.toLowerCase()),
  },
);

source.setQuery({ search: 'a' });
console.log(source.snapshot.data);
source.dispose();
```

Read `snapshot.query`, `snapshot.data`, and `snapshot.pagination` together. They always describe one loaded result.

## Handle Pending Remote Queries

Use `pendingQuery` to distinguish loaded data from newer work.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource<string>({
  autoStart: false,
  load: async ({ query }) => {
    const data = ['Ada', 'Grace', 'Linus'];
    const start = (query.page - 1) * query.pageSize;

    return { data: data.slice(start, start + query.pageSize), total: data.length };
  },
});

source.subscribe((snapshot) => {
  if (snapshot.pendingQuery) console.log('Loading:', snapshot.pendingQuery);
  console.log('Loaded:', snapshot.query, snapshot.data);
});

await source.setQuery({ page: 2 });
source.dispose();
```

New `setQuery()` calls abort older requests. A failed current request preserves prior loaded data, records `snapshot.error`, and rejects the returned promise.

## Use Cursor Pagination

Use cursors when an API cannot provide stable page numbers.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const rows = ['A', 'B', 'C', 'D'];
const source = createCursorSource<string, number>({
  autoStart: false,
  initialQuery: { pageSize: 2 },
  load: async ({ query }) => {
    const start = query.after ?? 0;
    const data = rows.slice(start, start + query.pageSize);
    const nextCursor = start + data.length;

    return {
      data,
      nextCursor: nextCursor < rows.length ? nextCursor : undefined,
      previousCursor: start > 0 ? Math.max(0, start - query.pageSize) : undefined,
    };
  },
});

await source.reload();
await source.page.next();
console.log(source.snapshot.data);
source.dispose();
```

`after` and `before` cannot coexist. Search or page-size changes reset cursor state.

## Build an Infinite Feed

Use an infinite source when each page should append.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const source = createInfiniteSource<number>({
  autoStart: false,
  initialQuery: { pageSize: 2 },
  load: async ({ query }) => {
    const values = [1, 2, 3, 4, 5];
    const start = (query.page - 1) * query.pageSize;

    return { data: values.slice(start, start + query.pageSize), total: values.length };
  },
});

await source.loadMore();
await source.loadMore();
console.log(source.snapshot.data);
source.dispose();
```

`loadMore()` is a no-op while fetching or after `pagination.hasMore` becomes false.

## Testing and Debugging

Inject deterministic loaders in unit tests. Await source commands before reading final state.

```ts
import { expect, it } from 'vitest';
import { createPageSource } from '@vielzeug/sourcerer';

it('loads first page', async () => {
  const source = createPageSource({
    autoStart: false,
    load: async () => ({ data: ['Ada'], total: 1 }),
  });

  await source.reload();
  expect(source.snapshot.data).toEqual(['Ada']);
  source.dispose();
});
```

## Framework Integration

Subscribe through each framework’s lifecycle. Keep source creation stable across renders.

::: code-group

```tsx [React]
import { createPageSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

export function Users() {
  const source = useMemo(
    () => createPageSource({ load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }) }),
    [],
  );
  const snapshot = useSyncExternalStore(source.subscribe, () => source.snapshot);

  useEffect(() => () => source.dispose(), [source]);

  return <p>{snapshot.isFetching ? 'Loading' : snapshot.data.length}</p>;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({ load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }) });
const snapshot = shallowRef(source.snapshot);
const stop = source.subscribe((next) => (snapshot.value = next));

onUnmounted(() => {
  stop();
  source.dispose();
});
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createPageSource } from '@vielzeug/sourcerer';

  const source = createPageSource({ load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }) });
  let snapshot = source.snapshot;
  const stop = source.subscribe((next) => (snapshot = next));

  onDestroy(() => {
    stop();
    source.dispose();
  });
</script>

{#if snapshot.isFetching}Loading{/if}
{#each snapshot.data as user}{user.name}{/each}
```

:::

## Working with Other Vielzeug Libraries

Use Courier for transport policy. Sourcerer owns request succession; Courier owns HTTP behavior.

```ts
import { createCourier } from '@vielzeug/courier';
import { createPageSource } from '@vielzeug/sourcerer';

const courier = createCourier({ baseUrl: '/api' });
const source = createPageSource({
  load: ({ query, signal }) => courier.get('/users', { query, signal }),
});
```

Use Scout’s matcher when local search needs an index.

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const users = [{ name: 'Ada' }, { name: 'Grace' }];
const index = createIndex(users, { fields: ['name'] });
const source = createLocalSource(users, { match: toSearchMatcher(index) });
```

## Gotchas

### Navigation methods are no-ops while fetching

`page.go()`, `page.next()`, `page.previous()`, `page.last()` (page and cursor sources) and `loadMore()` (infinite source) return a resolved promise and change nothing while a request is in flight. This prevents queued navigation from racing with abort logic. If a user clicks "next" during a fetch, the click is lost — debounce or disable navigation controls while `snapshot.isFetching` is true.

### `pendingQuery` means a different query is in flight

For page and cursor sources, `pendingQuery` is always set when a new query is loading. For infinite sources, `pendingQuery` is set only when `setQuery()` or `reload()` replaces the query — not during `loadMore()` append fetches. To detect an append in progress on an infinite source, read `snapshot.isFetching` with `pendingQuery` absent.

### `sameQuery` uses reference equality

`setQuery()` compares the new query against the current one using `Object.is` per field. For `filter` and `sort` (opaque `TFilter`/`TSort` types), a new object with the same content triggers a refetch. Memoize filter/sort objects in your application layer if you want to avoid redundant requests.

### Clear optional query fields by passing `undefined` explicitly

In `PageQueryPatch`, omitting `filter` preserves the current value; passing `filter: undefined` clears it. The same applies to `sort`. In `CursorQueryPatch`, omitting `after`/`before` preserves the current cursor; passing `after: undefined` or `before: undefined` clears it. This distinction is runtime-only — TypeScript's optional-field syntax does not distinguish "absent" from "explicitly `undefined`."

```ts
// Page source: keep current filter, change page:
source.setQuery({ page: 2 });

// Page source: clear filter, reset to page 1:
source.setQuery({ filter: undefined });

// Cursor source: clear after cursor:
source.setQuery({ after: undefined });
```

## Best Practices

- Dispose each source with its owning view, request, or scope.
- Read one snapshot object per render instead of mixing source fields across updates.
- Inspect `pendingQuery` before rendering controls for in-flight work.
- Validate URL query values before passing them to `setQuery()`.
- Keep caching, retries, polling, and optimistic writes in your transport layer.
- Use `setData()` with prepared local collections; keep ranking and filtering explicit.
- Debounce text inputs before updating remote source queries.
