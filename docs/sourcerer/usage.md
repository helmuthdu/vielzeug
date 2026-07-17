---
title: Sourcerer — Usage Guide
description: Practical usage patterns for local, remote, cursor, and infinite sources in @vielzeug/sourcerer.
---

[[toc]]

## Basic Usage

`createLocalSource()` manages an in-memory array. All operations are synchronous; methods return resolved promises so code is uniform with remote sources.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'user' };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'user' },
];

const source = createLocalSource<User>(users, { limit: 2 });
await source.search('ada', { immediate: true });
console.log(source.current); // [{ id: 1, name: 'Ada Lovelace', role: 'admin' }]
console.log(source.meta.pageNumber); // 1
console.log(source.meta.totalItems); // 1
```

## Local Source

`createLocalSource()` manages an in-memory array. Recomputation is synchronous unless `filterAsync` or `sortAsync` is configured.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'user' };

const source = createLocalSource<User>(users, { limit: 10 });
```

### Config options

```ts
createLocalSource(data, {
  limit: 10, // items per page (default: 20)
  debounceMs: 300, // debounce delay for source.search() (default: 300)
  filter: (u) => u.active, // initial synchronous filter predicate
  sort: (a, b) => a.name.localeCompare(b.name), // initial sorter
  searchFn: searchBy([(u) => u.name, (u) => u.email]), // override default search
  // Async variants — enable Web Worker offloading via @vielzeug/familiar:
  filterAsync: async (items, signal) => items.filter(/* expensive filter */),
  sortAsync: async (items, signal) => [...items].sort(/* expensive sort */),
});
```

For large in-memory datasets, prefer the `searchBy(...)` preset over the default `JSON.stringify` search:

```ts
import { createLocalSource, searchBy } from '@vielzeug/sourcerer';

const source = createLocalSource(users, {
  searchFn: searchBy([(u) => u.name, (u) => u.email]),
});
```

`filterAsync` and `sortAsync` run after their synchronous counterparts. They set `meta.isLoading = true` during computation and accept an `AbortSignal` — a new call aborts any running async computation.

### Mutations

```ts
await source.search('ada', { immediate: true }); // cancels debounce and awaits the result
void source.search('ada'); // debounced — resolves after debounceMs + recompute
await source.patch({ filter: (u) => u.role === 'admin', sort: (a, b) => a.name.localeCompare(b.name) });
await source.patch({ search: 'ada', limit: 5 }); // apply multiple changes in one recompute
await source.goTo(2);
await source.setData(newUsers); // replace entire dataset
await source.reset(); // restore initial filter/sort, reset to page 1
```

### Restoring from URL state

Use `applyQuery()` + `decodeQuery()` to restore URL-decoded state in a single atomic recompute.

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const query = decodeQuery(new URLSearchParams(location.search), { defaultLimit: 10 });
await applyQuery(source, query);
```

## Remote Source

`createRemoteSource()` wraps an async `fetch` function and manages page state, loading, errors, debounced search, concurrency, and request cancellation.

```ts
import { createRemoteSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };
type UserFilter = { role?: 'admin' | 'user' };
type UserSort = { by: 'name' | 'id'; dir: 'asc' | 'desc' };

const source = createRemoteSource<User, UserFilter, UserSort>({
  fetch: async ({ filter, limit, page, search, sort }, signal) => {
    const res = await fetch(`/api/users?page=${page}&limit=${limit}`, { signal });
    return res.json(); // { items: User[], total: number }
  },
  filter: { role: 'user' },
  sort: { by: 'name', dir: 'asc' },
  limit: 25,
  // autoFetch: true  (default — fetches on creation)
});

await source.ready();
```

### Config options

```ts
createRemoteSource({
  fetch, // required: (query, AbortSignal) => Promise<{ items, total }>
  limit: 25, // items per page (default: 20)
  debounceMs: 300, // debounce for source.search() (default: 300)
  filter, // initial filter value
  sort, // initial sort value
  autoFetch: true, // fetch on creation (default: true)
  queryKey: (q) => `${q.page}-${q.limit}`, // custom deduplication key
  staleTime: 5000, // skip re-fetch if last fetch was within this many ms (default: 0)
  refreshInterval: 30_000, // auto re-fetch every N ms; cancelled on dispose()
  retry: { attempts: 2, delay: (n) => n * 1000 }, // retry on failure
  onFetch: (event) => logger.info(event), // telemetry callback
  snapshot, // pre-populate from SSR snapshot
});
```

`staleTime` compares the **query key** — navigating to a different page always fetches even when the previous result is still within the stale window.
When an `optimisticUpdate()` is active, `refresh()` always fetches even within `staleTime` so the optimistic state can settle deterministically.

### The `fetch` callback

The `fetch` function receives the current query and an `AbortSignal`. Pass the signal to your HTTP client to enable automatic cancellation of superseded requests.

```ts
fetch: async ({ filter, limit, page, search, sort }, signal) => {
  const res = await fetch('/api/items', {
    method: 'POST',
    signal,
    body: JSON.stringify({ filter, limit, page, search, sort }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
},
```

### Mutations

```ts
await source.search('ada', { immediate: true });
void source.search('ada'); // debounced — resolves after debounceMs + fetch
await source.patch({ search: 'ada', filter: { role: 'admin' }, limit: 25 }); // atomic — one fetch
await source.goTo(3);
await source.next();
await source.prev();
await source.goToLast();
await source.reset(); // restore initial config and refetch
await source.refresh(); // re-fetch current query
```

### Restoring from URL state

`applyQuery()` is a no-op when `changes` is empty — safe to call on every page load.

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const query = decodeQuery(new URLSearchParams(location.search), { defaultLimit: 25 });
await applyQuery(source, query);
```

### Optimistic updates

Apply a mutator immediately so the UI reflects the change before the server confirms.

```ts
const rollback = source.optimisticUpdate((current) => current.filter((u) => u.id !== deletedId), {
  total: source.meta.totalItems - 1,
});

try {
  await api.users.delete(deletedId);
  await source.refresh(); // server confirms — optimistic state cleared automatically
} catch {
  rollback(); // server rejected — restore previous items
}
```

- The rollback function is a **no-op** once the next successful fetch has settled.
- On fetch failure, the pre-optimistic items are restored (not an empty array).
- Only one optimistic update can be active at a time — a second call throws.

### Concurrency and request deduplication

- Superseded requests (different query key) are **aborted** automatically via `AbortSignal`.
- Duplicate requests (same query key, fired while one is in-flight) are **joined** — only one network call is made.
- Stale responses are **discarded** — only the most recent query key's response is applied to state.

### `ready()` — waiting for initial load

```ts
const source = createRemoteSource({ fetch, autoFetch: true });
await source.ready(); // resolves when pendingCount === 0 and no debounce timer is active
await source.ready(5000); // rejects with timeout error after 5 s if still loading
```

Use `ready()` in server-side rendering, test setup, or any flow that needs initial data before rendering.

## Cursor Source

`createCursorSource()` is for APIs that return opaque cursor tokens instead of page numbers — common with relay-style GraphQL, DynamoDB, and Stripe.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

const source = createCursorSource<Item, string>({
  fetch: async ({ after, before, limit, search }, signal) => {
    const res = await fetch(`/api/items?after=${after ?? ''}&limit=${limit}`, { signal });
    const data = await res.json();
    return {
      items: data.items,
      nextCursor: data.nextCursor, // string | undefined
      prevCursor: data.prevCursor, // string | undefined
      total: data.total, // optional
    };
  },
  limit: 20,
});

await source.ready();
console.log(source.meta.hasNextPage, source.meta.hasPrevPage);

await source.next(); // advance to next page using nextCursor
await source.prev(); // go back using prevCursor
await source.reset(); // clear cursors and refetch from the start
```

`next()` and `prev()` are no-ops if there is no cursor in that direction.

## Infinite Source

`createInfiniteSource()` accumulates items in `source.current` as the user loads more pages. Searching and `reset()` clear the accumulator and start fresh from page 1.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const source = createInfiniteSource<Post>({
  fetch: async ({ limit, page, search }, signal) => {
    const res = await fetch(`/api/posts?page=${page}&limit=${limit}`, { signal });
    return res.json(); // { items: Post[], total: number }
  },
  limit: 20,
});

await source.ready();
console.log(source.current); // first page of posts
console.log(source.meta.hasMore); // true if more pages exist
console.log(source.meta.isLoadingMore); // true only during loadMore() fetches

await source.loadMore(); // fetches page 2 and appends to source.current
await source.loadMore(); // fetches page 3, appends again

await source.reset(); // clear all, restart from page 1
```

`loadMore()` is a no-op when `meta.hasMore` is `false`.

`meta.isLoadingMore` is `true` only during `loadMore()` — distinct from `meta.isLoading` which is `true` during `reset()` and the initial fetch.

### Restoring from URL state

Use `applyQuery()` + `decodeQuery()` to restore `limit` and `search`. `patch()` clears accumulated items and refetches from page 1 if any value changed.

```ts
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const query = decodeQuery(new URLSearchParams(location.search), { defaultLimit: 20 });
await applyQuery(source, { limit: query.limit, search: query.search });
```

## Error Handling

All sources expose `meta.error` as a `SourcererError | null`. `SourcererError` extends `Error` and carries structured context for logging and display:

```ts
if (source.meta.error) {
  console.error(source.meta.error.message); // human-readable message
  console.error(source.meta.error.cause); // original thrown value
  console.error(source.meta.error.context); // structured context bag (query fields, kind, etc.)
}
```

For simpler branching, use `sourceState()`:

```ts
import { sourceState } from '@vielzeug/sourcerer';

const state = sourceState(source);

switch (state.status) {
  case 'loading':
    return renderSpinner();
  case 'error':
    return renderError(state.error.message);
  case 'success':
    return renderList(state.items);
}
```

`sourceState()` works with any source type.

## Read Model

Every source exposes `current`, `meta`, and `subscribe`.

```ts
source.current; // readonly T[] — items on the current page (or all accumulated for infinite)
source.meta; // SourceMeta | CursorMeta | InfiniteMeta — pagination and status snapshot
```

### `SourceMeta`

```ts
type SourceMeta = Readonly<{
  error: SourcererError | null; // null when healthy
  isLoading: boolean;
  isSearchPending: boolean; // true while a debounced search timer is active
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;
```

Use `itemRange()` to compute display-level item numbers:

```ts
import { itemRange } from '@vielzeug/sourcerer';

const { start, end } = itemRange(source.meta);
// e.g. "Showing 21–40 of 150"
console.log(`Showing ${start}–${end} of ${source.meta.totalItems}`);
```

### `CursorMeta`

```ts
type CursorMeta = Readonly<{
  error: SourcererError | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;
```

### `InfiniteMeta`

```ts
type InfiniteMeta = Readonly<{
  error: SourcererError | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean; // true only during loadMore() — not during reset()
  isSearchPending: boolean;
  loadedPages: number; // number of pages currently accumulated in current[]
  pageSize: number;
  totalItems: number;
}>;
```

`meta` is replaced with a new object reference on every change. Both `current` and `meta` are stable between changes — safe to compare with `===` to detect updates.

## Subscriptions and Disposal

All sources expose a framework-agnostic `subscribe` method that returns an unsubscribe function:

```ts
const unsubscribe = source.subscribe(() => {
  render(source.current, source.meta);
});

// later:
unsubscribe();
```

All sources implement `[Symbol.dispose]()`. Use the TC39 `using` declaration to auto-dispose on scope exit:

```ts
{
  using source = createLocalSource(data, { limit: 10 });
  // source is automatically disposed when the block exits
}
```

## URL Query Param Sync

`encodeQuery()` serializes source state to flat URL-safe string params.
`decodeQuery()` parses URL params (or a `URLSearchParams` instance) back into a partial query object.

```ts
import { decodeQuery, encodeQuery } from '@vielzeug/sourcerer';

// Serialize current state
const params = encodeQuery(source.query);
// -> { page: '2', limit: '25', search: 'ada', filter: '{"role":"admin"}' }

// Restore from URLSearchParams directly
const query = decodeQuery(new URLSearchParams(location.search), { defaultLimit: 25 });
await applyQuery(source, query);
```

`decodeQuery` is fault-tolerant by default — malformed `filter`/`sort` JSON is silently dropped. Pass `{ strict: true }` to throw instead.

`search` is omitted from both `source.query` and `decodeQuery()` output when no search is active (no `search: ''` noise in URLs).

## SSR Prefetch

`prefetchSource()` fetches one page on the server and returns a serialisable `SourceSnapshot`. Pass the snapshot to `createRemoteSource({ snapshot })` on the client to skip the initial loading flash.

```ts
// server.ts
import { prefetchSource } from '@vielzeug/sourcerer';

const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });
// snapshot is JSON-serialisable: { items, total, page, search? }

// client.ts
import { createRemoteSource } from '@vielzeug/sourcerer';

const source = createRemoteSource({ fetch: fetchUsers, limit: 20, snapshot });
// source starts populated — no loading flash
```

`prefetchSource()` throws a `SourcererError` if the fetch fails. Handle it server-side before embedding the snapshot.

To get both the snapshot and a live source without a double-fetch, use `prefetchSourceAndKeep()`:

```ts
import { prefetchSourceAndKeep } from '@vielzeug/sourcerer';

const { snapshot, source } = await prefetchSourceAndKeep({ fetch: fetchUsers, limit: 20 });
// Use snapshot for SSR HTML embedding, source for subsequent client-side updates
// Caller is responsible for calling source.dispose()
source.dispose();
```

## Framework Integration

::: code-group

```tsx [React]
import { useMemo, useSyncExternalStore } from 'react';
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };

function UsersList({ users }: { users: User[] }) {
  const source = useMemo(() => createLocalSource(users, { limit: 10 }), [users]);
  const current = useSyncExternalStore(source.subscribe, () => source.current);
  const meta = useSyncExternalStore(source.subscribe, () => source.meta);

  return (
    <>
      <input onChange={(e) => source.search(e.target.value)} placeholder="Search" />
      <ul>
        {current.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
      <button onClick={() => source.prev()} disabled={meta.pageNumber <= 1}>
        Prev
      </button>
      <button onClick={() => source.next()} disabled={meta.pageNumber >= meta.pageCount}>
        Next
      </button>
    </>
  );
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string };

const source = createLocalSource<User>(users, { limit: 10 });
const state = shallowRef({ current: source.current, meta: source.meta });

const stop = source.subscribe(() => {
  state.value = { current: source.current, meta: source.meta };
});

onUnmounted(stop);
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createLocalSource } from '@vielzeug/sourcerer';

  type User = { id: number; name: string };

  const source = createLocalSource<User>(users, { limit: 10 });
  let current = source.current;
  let meta = source.meta;

  const stop = source.subscribe(() => {
    current = source.current;
    meta = source.meta;
  });

  onDestroy(stop);
</script>

<input on:input={(e) => source.search(e.currentTarget.value)} />
{#each current as user}
  <div>{user.name}</div>
{/each}
<button on:click={() => source.prev()} disabled={meta.pageNumber <= 1}>Prev</button>
<button on:click={() => source.next()} disabled={meta.pageNumber >= meta.pageCount}>Next</button>
```

:::

## Working with Other Vielzeug Libraries

### With Courier

```ts
import { createApi } from '@vielzeug/courier';
import { createRemoteSource } from '@vielzeug/sourcerer';

const api = createApi({ baseUrl: '/api' });

const source = createRemoteSource<Issue, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }, signal) =>
    api.get('/issues', { query: { filter, limit, page, search, sort }, signal }),
  limit: 25,
});
```

### With Ripple

Subscribe to the source and drive Ripple signals from the callback:

```ts
import { effect, signal, store } from '@vielzeug/ripple';
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(users, { limit: 10 });
const items = signal<readonly User[]>([]);
const meta = signal(source.meta);

// Drive Ripple signals from the source
const unsub = source.subscribe(() => {
  items.value = source.current;
  meta.value = source.meta;
});

const controls = store({ query: '' });
effect(() => {
  void source.search(controls.value.query); // debounced — re-runs on every query change
});
// items.value and meta.value stay in sync automatically
```

## Best Practices

- Use `search(q, { immediate: true })` for form submit actions; use `search(q)` (debounced) for keypress flows. Both return `Promise<void>`.
- Use `patch({ search, filter, sort })` when you need to apply multiple query changes in a single fetch.
- Pass the `AbortSignal` from the `fetch` callback to your HTTP client so superseded requests are cancelled.
- Call `ready()` in server-side rendering or test setup — not in every render cycle.
- Always call the unsubscribe function returned by `subscribe()` when the component is torn down.
- For URL sync, use `decodeQuery()` + `applyQuery()` rather than reconstructing source state from params manually.
- Use `staleTime` with `refreshInterval` for stale-while-revalidate patterns on dashboards.
- If you use `optimisticUpdate()`, call `refresh()` after mutation confirmation; it bypasses `staleTime` while optimistic state is active.
- Only one `optimisticUpdate()` can be active at a time — always handle the thrown error or check before calling.
- When using `decodeQuery()`, validate the parsed `filter` and `sort` with a type guard before passing to the server — they are returned as-is without runtime validation.
- For infinite sources, pass `{ limit: query.limit, search: query.search }` to `applyQuery()` for URL state sync — `page` is not restorable since items accumulate across pages.
