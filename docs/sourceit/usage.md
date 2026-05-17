---
title: Sourceit — Usage Guide
description: Practical usage patterns for local and remote sources in @vielzeug/sourceit.
---

[[toc]]

## Create a Local Source

```ts
import { createLocalSource } from '@vielzeug/sourceit';

type User = { id: number; name: string; role: 'admin' | 'user' };

const source = createLocalSource<User>(users, { limit: 10 });
```

### Local mutations

```ts
source.setFilter((user) => user.role === 'admin');
source.setSort((a, b) => a.name.localeCompare(b.name));
source.searchNow('ada');
source.goTo(2);
```

### Atomic updates

Use `batch()` when multiple changes should apply together.

```ts
source.batch((ctx) => {
  ctx.setFilter((u) => u.role === 'user');
  ctx.search('lin');
  ctx.setLimit(5);
});
```

## Create a Remote Source

```ts
import { createRemoteSource } from '@vielzeug/sourceit';

type User = { id: number; name: string };
type UserFilter = { role?: 'admin' | 'user' };
type UserSort = { by: 'name' | 'id'; dir: 'asc' | 'desc' };

const source = createRemoteSource<User, UserFilter, UserSort>({
  fetch: async ({ filter, limit, page, search, sort }) => {
    const result = await api.users.list({ filter, limit, page, search, sort });

    return { items: result.items, total: result.total };
  },
  filter: { role: 'user' },
  sort: { by: 'name', dir: 'asc' },
  limit: 25,
});
```

### Remote lifecycle

```ts
source.refresh();
await source.ready();

source.search('ada');
source.commit();
await source.ready();
```

## Read model

Both local and remote sources expose:

- `current`: the current page items
- `meta`: pagination and status info (`pageNumber`, `pageCount`, `totalItems`, `isLoading`, `errorMessage`)
- `toQuery()`: serializable state for URL/state sync

```ts
const { current, meta } = source;
console.log(current.length, meta.pageNumber, meta.totalItems);
```

## URL Query Param Sync

```ts
import { encodeLocalQueryParams } from '@vielzeug/sourceit';

const params = encodeLocalQueryParams(source.toQuery());
// -> { page: '2', limit: '25', search: 'ada' }

source.fromQueryParams(params);
```

## Selector subscriptions

Use the utility for value-based subscriptions.

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

## Framework Integration

sourceit exposes framework-agnostic primitives: `subscribe(listener)`, stable
`current`, and stable `meta` snapshots. Frameworks can consume these directly
with their native reactivity APIs.

### Local source in UI state

::: code-group

```tsx [React]
// React 18+ ships useSyncExternalStore natively.
// For older React, install the 'use-sync-external-store' shim.
import { createLocalSource } from '@vielzeug/sourceit';
import { useMemo, useSyncExternalStore } from 'react';

export function UsersList({ users }: { users: { id: number; name: string }[] }) {
  const source = useMemo(() => createLocalSource(users, { limit: 10 }), [users]);
  const current = useSyncExternalStore(source.subscribe, () => source.current);
  const meta = useSyncExternalStore(source.subscribe, () => source.meta);

  return (
    <>
      <input onChange={(e) => source.search(e.target.value)} placeholder="Search users" />
      <ul>
        {current.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
      <button onClick={() => source.prev()} disabled={meta.isFirstPage}>
        Prev
      </button>
      <button onClick={() => source.next()} disabled={meta.isLastPage}>
        Next
      </button>
    </>
  );
}
```

```ts [Vue]
import { createLocalSource } from '@vielzeug/sourceit';
import { onUnmounted, shallowRef } from 'vue';

const source = createLocalSource(users, { limit: 10 });
const state = shallowRef({ current: source.current, meta: source.meta });

const stop = source.subscribe(() => {
  state.value = { current: source.current, meta: source.meta };
});

onUnmounted(stop);
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createLocalSource } from '@vielzeug/sourceit';

  const source = createLocalSource(users, { limit: 10 });
  let current = source.current;
  let meta = source.meta;

  const stop = source.subscribe(() => {
    current = source.current;
    meta = source.meta;
  });

  onDestroy(stop);
</script>

<input on:input={(e) => source.search((e.currentTarget as HTMLInputElement).value)} />
{#each current as user}
  <div>{user.name}</div>
{/each}
<button on:click={() => source.prev()} disabled={meta.isFirstPage}>Prev</button>
<button on:click={() => source.next()} disabled={meta.isLastPage}>Next</button>
```

:::

### Remote source with async lifecycle

::: code-group

```tsx [React]
import { createRemoteSource } from '@vielzeug/sourceit';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

export function IssuesList() {
  const source = useMemo(
    () =>
      createRemoteSource({
        fetch: ({ limit, page, search }) => api.issues.list({ limit, page, search }),
        limit: 20,
      }),
    [],
  );
  const meta = useSyncExternalStore(source.subscribe, () => source.meta);

  useEffect(() => {
    source.refresh();
  }, [source]);

  return <div>{meta.isLoading ? 'Loading...' : `${meta.totalItems} issues`}</div>;
}
```

```ts [Vue]
import { createRemoteSource } from '@vielzeug/sourceit';
import { onMounted, onUnmounted, shallowRef } from 'vue';

const source = createRemoteSource({
  fetch: ({ limit, page, search }) => api.issues.list({ limit, page, search }),
  limit: 20,
});
const state = shallowRef({ current: source.current, meta: source.meta });

const stop = source.subscribe(() => {
  state.value = { current: source.current, meta: source.meta };
});

onMounted(() => source.refresh());
onUnmounted(stop);
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createRemoteSource } from '@vielzeug/sourceit';

  const source = createRemoteSource({
    fetch: ({ limit, page, search }) => api.issues.list({ limit, page, search }),
    limit: 20,
  });
  let meta = source.meta;

  const stop = source.subscribe(() => {
    meta = source.meta;
  });

  onMount(() => source.refresh());
  onDestroy(stop);
</script>

{#if meta.isLoading}
  <p>Loading...</p>
{:else}
  <p>{meta.totalItems} issues</p>
{/if}
```

:::

## Working with Other Vielzeug Libraries

### With Fetchit

Use Fetchit as the transport layer inside `createRemoteSource()` for consistent retries and error handling.

```ts
import { createApi } from '@vielzeug/fetchit';
import { createRemoteSource } from '@vielzeug/sourceit';

const api = createApi({ baseUrl: '/api' });

const source = createRemoteSource({
  fetch: ({ page, limit, search }) => api.get('/issues', { query: { page, limit, search } }),
});
```

## Best Practices

- Prefer `batch()` for grouped changes.
- Use `searchNow(term)` for explicit submit actions.
- Use debounced search for text-input flows.
- Call `ready()` only for remote flows that require async completion.
- Keep filter/sort payloads serializable for remote URL sync.
