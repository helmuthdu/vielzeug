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
source.search('ada', true);
source.goTo(2);
```

### Atomic updates

Use `update()` when multiple changes should apply together.

```ts
source.update((ctx) => {
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
  initialFilter: { role: 'user' },
  initialSort: { by: 'name', dir: 'asc' },
  limit: 25,
});
```

### Remote lifecycle

```ts
source.refresh();
await source.ready();

source.search('ada');
source.flush();
await source.ready();
```

## Read model

Both local and remote sources expose:

- `current`: the current page items
- `meta`: pagination and status info (`pageNumber`, `pageCount`, `totalItems`, `isLoading`, `errorMessage`)
- `snapshot()`: serializable state for URL/state sync

```ts
const { current, meta } = source;
console.log(current.length, meta.pageNumber, meta.totalItems);
```

## URL Query Param Sync

```ts
const params = source.toQueryParams();
// -> { page: '2', limit: '25', search: 'ada', ... }

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

### Local source in UI state

::: code-group

```tsx [React]
import { createLocalSource } from '@vielzeug/sourceit';
import { useEffect, useMemo, useState } from 'react';

export function UsersList({ users }: { users: { id: number; name: string }[] }) {
  const source = useMemo(() => createLocalSource(users, { limit: 10 }), [users]);
  const [, rerender] = useState(0);

  useEffect(() => source.subscribe(() => rerender((n) => n + 1)), [source]);

  return (
    <>
      <input onChange={(e) => source.search(e.target.value)} placeholder="Search users" />
      <ul>{source.current.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
      <button onClick={() => source.prev()} disabled={source.meta.isFirstPage}>Prev</button>
      <button onClick={() => source.next()} disabled={source.meta.isLastPage}>Next</button>
    </>
  );
}
```

```ts [Vue]
import { createLocalSource } from '@vielzeug/sourceit';
import { onUnmounted, ref } from 'vue';

const source = createLocalSource(users, { limit: 10 });
const tick = ref(0);
const stop = source.subscribe(() => {
  tick.value += 1;
});

onUnmounted(stop);
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createLocalSource } from '@vielzeug/sourceit';

  const source = createLocalSource(users, { limit: 10 });
  let tick = 0;
  const stop = source.subscribe(() => {
    tick += 1;
  });

  onDestroy(stop);
</script>

<input on:input={(e) => source.search((e.currentTarget as HTMLInputElement).value)} />
{#each source.current as user}
  <div>{user.name}</div>
{/each}
```

:::

### Remote source with async lifecycle

::: code-group

```tsx [React]
import { createRemoteSource } from '@vielzeug/sourceit';
import { useEffect, useMemo, useState } from 'react';

export function IssuesList() {
  const source = useMemo(
    () =>
      createRemoteSource({
        fetch: ({ limit, page, search }) => api.issues.list({ limit, page, search }),
        limit: 20,
      }),
    [],
  );
  const [, rerender] = useState(0);

  useEffect(() => source.subscribe(() => rerender((n) => n + 1)), [source]);
  useEffect(() => {
    source.refresh();
  }, [source]);

  return <div>{source.meta.isLoading ? 'Loading...' : `${source.meta.totalItems} issues`}</div>;
}
```

```ts [Vue]
import { createRemoteSource } from '@vielzeug/sourceit';
import { onMounted, onUnmounted, ref } from 'vue';

const source = createRemoteSource({
  fetch: ({ limit, page, search }) => api.issues.list({ limit, page, search }),
  limit: 20,
});
const tick = ref(0);
const stop = source.subscribe(() => {
  tick.value += 1;
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

  let tick = 0;
  const stop = source.subscribe(() => {
    tick += 1;
  });

  onMount(() => {
    source.refresh();
  });

  onDestroy(stop);
</script>

{#if source.meta.isLoading}
  <p>Loading...</p>
{:else}
  <p>{source.meta.totalItems} issues</p>
{/if}
```

:::

## Best Practices

- Prefer `update()` for grouped changes.
- Use immediate search (`search(term, true)`) for explicit submit actions.
- Use debounced search for text-input flows.
- Call `ready()` only for remote flows that require async completion.
- Keep filter/sort payloads serializable for remote URL sync.
