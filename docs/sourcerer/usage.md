---
title: Sourcerer — Usage Guide
description: Build local, page, cursor, and infinite collection sources.
---

[[toc]]

## Basic Usage

Create a page source and call `reload()` to start the first request. Construction performs no I/O.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const names = ['Ada', 'Grace', 'Linus'];
const source = createPageSource({
  load: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    return { items: names.slice(start, start + pageSize), totalItems: names.length };
  },
  pageSize: 2,
});

await source.reload();
console.log(source.state.items);
source.dispose();
```

Read one `state` object per render. It contains `items`, `loading`, `error`, `params`, and pagination metadata from one committed result. Commands return `Promise<void>`; read `source.state` after awaiting them.

## Pass Loader Parameters

Use `params` for application-owned filters, search terms, sort state, or request options. `setParams()` replaces the entire value and resets pagination.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type UserParams = { role: 'admin' | 'user'; search: string };
const users = ['Ada', 'Grace', 'Linus'];
const source = createPageSource<string, UserParams>({
  load: async ({ page, pageSize, params }) => {
    const matching = users.filter((name) => name.toLowerCase().includes(params.search.toLowerCase()));
    const start = (page - 1) * pageSize;
    return { items: matching.slice(start, start + pageSize), totalItems: matching.length };
  },
  params: { role: 'admin', search: '' },
});

await source.setParams({ role: 'admin', search: 'ada' });
console.log(source.state.params);
source.dispose();
```

A non-optional parameter type requires an initial `params` value. Sourcerer compares parameter values with `Object.is`; reuse a value when setting it again should be a no-op.

While replacement parameters load, `state.params` continues to describe the committed items and `state.pendingParams` contains the requested value. Page-only navigation does not set `pendingParams`.

## Navigate Numbered Pages

Use direct commands for numbered-page navigation. `setPageSize()` resets to page one.

```ts
await source.reload();
await source.next();
await source.goTo(4);
await source.previous();
await source.first();
await source.last();
await source.setPageSize(50);
```

After the first successful load, navigation is clamped to the known `pageCount`. Before that load, `goTo()` accepts any positive page because the total is unknown.

## Filter Local Collections

Use a local source when data is already in memory. Its commands are synchronous.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(['Ada', 'Grace', 'Linus'], {
  filter: (name, search: string) => name.toLowerCase().includes(search.toLowerCase()),
  pageSize: 2,
  params: '',
});

source.setParams('a');
source.next();
source.setItems(['Ada', 'Grace']);
console.log(source.state.items);
source.dispose();
```

Use ordinary arrays for one-off transformations. A local source is useful when pagination, subscriptions, and lifecycle ownership are also required.

## Use Cursor Pagination

Return opaque cursors from the loader. `next()` and `previous()` use only cursors from the committed state.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const rows = ['A', 'B', 'C', 'D'];
const source = createCursorSource({
  load: async ({ after, pageSize }) => {
    const start = after ? Number(after) : 0;
    const items = rows.slice(start, start + pageSize);
    const next = start + items.length;
    return {
      items,
      nextCursor: next < rows.length ? String(next) : undefined,
      previousCursor: start > 0 ? String(Math.max(0, start - pageSize)) : undefined,
    };
  },
  pageSize: 2,
});

await source.reload();
await source.next();
console.log(source.state.items);
source.dispose();
```

Changing params or page size clears current cursor direction. A source cannot start with both `after` and `before`.

## Build an Infinite Feed

Use an infinite source when later pages should append to committed items.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const values = [1, 2, 3, 4, 5];
const source = createInfiniteSource({
  load: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    return { items: values.slice(start, start + pageSize), totalItems: values.length };
  },
  pageSize: 2,
});

await source.reload();
await source.loadMore();
console.log(source.state.items);
source.dispose();
```

`loadMore()` is a no-op while another request is active or after `pagination.hasMore` becomes false. `setParams()` and `setPageSize()` replace the feed from page one.

## Handle Requests and Errors

A new remote command aborts older work. Superseded or disposed work settles without committing. A current loader failure preserves committed items, writes the error to state, and rejects the command.

```ts
try {
  await source.reload();
} catch (error) {
  console.error(error);
  console.log(source.state.error);
}
```

Loader result arrays are copied before publication. Commands after disposal throw or reject `SourcererDisposedError`.

## Testing

Inject deterministic loaders and await commands before asserting final state.

```ts
import { expect, it } from 'vitest';
import { createPageSource } from '@vielzeug/sourcerer';

it('loads a page', async () => {
  const source = createPageSource({ load: async () => ({ items: ['Ada'], totalItems: 1 }) });

  await source.reload();

  expect(source.state.items).toEqual(['Ada']);
  source.dispose();
});
```

## Framework Integration

Create one source per component lifetime and bridge `subscribe()` to the framework lifecycle.

::: code-group

```tsx [React]
import { createPageSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

export function Users() {
  const source = useMemo(
    () => createPageSource({ load: async () => ({ items: [{ id: 1, name: 'Ada' }], totalItems: 1 }) }),
    [],
  );
  const state = useSyncExternalStore(source.subscribe, () => source.state);

  useEffect(() => {
    void source.reload().catch(() => undefined);
    return () => source.dispose();
  }, [source]);

  return <p>{state.loading ? 'Loading' : state.items.length}</p>;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({ load: async () => ({ items: [{ id: 1, name: 'Ada' }], totalItems: 1 }) });
const state = shallowRef(source.state);
const stop = source.subscribe((next) => (state.value = next));
void source.reload().catch(() => undefined);

onUnmounted(() => {
  stop();
  source.dispose();
});
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createPageSource } from '@vielzeug/sourcerer';

  const source = createPageSource({ load: async () => ({ items: [{ id: 1, name: 'Ada' }], totalItems: 1 }) });
  let state = source.state;
  const stop = source.subscribe((next) => (state = next));
  void source.reload().catch(() => undefined);

  onDestroy(() => {
    stop();
    source.dispose();
  });
</script>

{#if state.loading}Loading{/if}
{#each state.items as user}{user.name}{/each}
```

:::

## Working with Other Vielzeug Libraries

Use Courier for transport policy and pass the source-owned cancellation signal through.

```ts
import { createCourier } from '@vielzeug/courier';
import { createPageSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };
type Response = { data: User[]; total: number };
const courier = createCourier({ baseUrl: '/api' });
const source = createPageSource({
  load: async ({ page, pageSize, params: search, signal }) => {
    const result = await courier.get<Response>('/users', { query: { page, pageSize, search }, signal });
    return { items: result.data, totalItems: result.total };
  },
  params: '',
});
```

Use Scout to compute indexed local matches, Ripple to project state into reactive computations, and Wayfinder to validate and synchronize params with the URL.

## Best Practices

- Dispose each source with its owning view, request, or service scope.
- Read one `state` object per render.
- Await direct commands or handle rejected current-request failures.
- Keep transport, caching, and persistence policy outside Sourcerer.
- Treat `params` as an immutable value and replace it atomically.
- Debounce text input before calling `setParams()` on a remote source.
- Validate route and form values before constructing params or page numbers.
- Keep rendering committed items while `loading` is true.
