---
title: 'Sourcerer Examples — Framework Integration'
description: Integrate createLocalSource and createRemoteSource with React, Vue, and Svelte.
---

## Framework Integration

### Problem

You are using React, Vue, or Svelte and need to wire a Sourcerer source into your component's render cycle — subscribing to changes, triggering initial loads, and cleaning up on unmount.

### Solution

Subscribe to the source in the appropriate component lifecycle hook for your framework. The source exposes a `subscribe()` method that returns an unsubscribe function. Call `refresh()` explicitly for remote sources to trigger the first fetch.

#### Local source

::: code-group

```tsx [React]
import { createLocalSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useState } from 'react';

export function LocalUsers({ users }: { users: { id: number; name: string }[] }) {
  const source = useMemo(() => createLocalSource(users, { limit: 10 }), [users]);
  const [, rerender] = useState(0);

  useEffect(() => source.subscribe(() => rerender((n) => n + 1)), [source]);

  return (
    <>
      <input onChange={(e) => source.search(e.target.value)} />
      {source.current.map((u) => (
        <div key={u.id}>{u.name}</div>
      ))}
    </>
  );
}
```

```ts [Vue]
import { createLocalSource } from '@vielzeug/sourcerer';
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
  import { createLocalSource } from '@vielzeug/sourcerer';

  const source = createLocalSource(users, { limit: 10 });
  let tick = 0;
  const stop = source.subscribe(() => {
    tick += 1;
  });

  onDestroy(stop);
</script>

{#each source.current as user}
  <div>{user.name}</div>
{/each}
```

:::

#### Remote source

::: code-group

```tsx [React]
import { createRemoteSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useState } from 'react';

export function RemoteIssues() {
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

  return <p>{source.meta.isLoading ? 'Loading...' : `${source.meta.totalItems} issues`}</p>;
}
```

```ts [Vue]
import { createRemoteSource } from '@vielzeug/sourcerer';
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
  import { createRemoteSource } from '@vielzeug/sourcerer';

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

<p>{source.meta.isLoading ? 'Loading...' : `${source.meta.totalItems} issues`}</p>
```

:::

### Pitfalls

- For remote sources, `refresh()` must be called explicitly after mount — the source does not auto-fetch on creation.
- Each component instance should create its own source (or share one via context/store); subscribing to a shared source that another component mutates can cause duplicate re-renders.
- In React, wrap `createLocalSource`/`createRemoteSource` in `useMemo` to avoid recreating the source on every render.

### Related

- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
- [Reactive Controls with Ripple](./sourcerer-with-ripple.md)
