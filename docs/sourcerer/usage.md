---
title: Sourcerer — Usage Guide
description: Practical usage patterns for local, remote, cursor, and infinite sources in @vielzeug/sourcerer.
---

[[toc]]

## Basic Usage

`createLocalSource()` manages an in-memory array. All operations are synchronous; the returned methods return resolved promises so code is uniform with remote sources.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'user' };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'user' },
];

const source = createLocalSource<User>(users, { limit: 2 });
await source.searchNow('ada');
console.log(source.current);         // [{ id: 1, name: 'Ada Lovelace', role: 'admin' }]
console.log(source.meta.pageNumber); // 1
console.log(source.meta.totalItems); // 1
```

## Local Source

`createLocalSource()` manages an in-memory array. All operations are synchronous; the returned methods return resolved promises so code is uniform with remote sources.

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'user' };

const source = createLocalSource<User>(users, { limit: 10 });
```

### Config options

```ts
createLocalSource(data, {
  limit: 10,          // items per page (default: 10)
  debounceMs: 300,    // debounce delay for source.search() (default: 300)
  filter: (u) => u.active,   // initial filter predicate
  sort: (a, b) => a.name.localeCompare(b.name), // initial sorter
  searchFn: (items, query) => items.filter(/* custom match */), // override default fuzzy search
});
```

### Mutations

```ts
source.setFilter((user) => user.role === 'admin');
source.setSort((a, b) => a.name.localeCompare(b.name));
await source.searchNow('ada');  // immediate
source.search('ada');           // debounced — fire-and-forget
await source.commit();          // flush pending debounced search
await source.goTo(2);
await source.setData(newUsers); // replace entire dataset
await source.reset();           // restore initial config, reset to page 1
```

### Atomic updates

Use `update()` to change multiple fields in a single operation. One recompute, one notification.

```ts
// Apply limit change and jump to a specific page together
await source.update({ limit: 5, page: 2 });

// Clear search and reset page
await source.update({ page: 1, search: '' });

// Replace filter and sort simultaneously — offset resets once
await source.update({ filter: (u) => u.active, sort: (a, b) => a.name.localeCompare(b.name) });
```

> `update()` skips fields that haven't changed (identity comparison for filter/sort, value comparison for primitives) — passing the same values is a no-op.

---

## Remote Source

`createRemoteSource()` wraps an async `fetch` function and manages page state, loading, error, debounced search, concurrency, and request cancellation.

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
  fetch,              // required: (query, AbortSignal) => Promise<{ items, total }>
  limit: 25,          // items per page (default: 10)
  debounceMs: 300,    // debounce for source.search() (default: 300)
  filter,             // initial filter value
  sort,               // initial sort value
  autoFetch: true,    // fetch on creation (default: true)
  queryKey: (q) => `${q.page}-${q.limit}`, // custom deduplication key
});
```

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
source.setFilter({ role: 'admin' });
source.setSort({ by: 'name', dir: 'asc' });
await source.searchNow('ada');
source.search('ada');     // debounced — triggers fetch after debounceMs
await source.commit();    // flush pending debounced search immediately
await source.goTo(3);
await source.next();
await source.prev();
await source.goToLast();
await source.reset();     // restore initial config and refetch
await source.refresh();   // re-fetch current query
```

### Atomic updates

Like `createLocalSource`, `update()` batches multiple field changes into a single fetch call.

```ts
await source.update({ limit: 5, page: 3, search: 'x' });
```

`update()` is a no-op if none of the provided values differ from the current state.

### Optimistic updates

Apply a mutator immediately so the UI reflects the change before the server confirms.

```ts
const rollback = source.optimisticUpdate(
  (current) => current.filter((u) => u.id !== deletedId),
  { total: source.meta.totalItems - 1 },
);

try {
  await api.users.delete(deletedId);
  await source.refresh(); // server confirms — optimistic state cleared automatically
} catch {
  rollback(); // server rejected — restore previous items
}
```

The returned `rollback` function is a no-op once the next successful fetch has settled; calling it after a confirmed server response is safe.

### Concurrency and request deduplication

- Superseded requests (different query key) are **aborted** automatically via `AbortSignal`.
- Duplicate requests (same query key, fired while one is in-flight) are **joined** — only one network call is made.
- Stale responses are **discarded** — only the most recent query key's response is applied to state.

### `ready()` — waiting for initial load

```ts
const source = createRemoteSource({ fetch, autoFetch: true });
await source.ready(); // resolves when pendingCount === 0 and no debounce timer is active
```

Use `ready()` in server-side rendering, test setup, or any flow that needs the initial data before rendering.

---

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
      nextCursor: data.nextCursor,  // string | undefined
      prevCursor: data.prevCursor,  // string | undefined
      total: data.total,            // optional
    };
  },
  limit: 20,
});

await source.ready();
console.log(source.meta.hasNextPage, source.meta.hasPrevPage);

await source.next();  // advance to next page using nextCursor
await source.prev();  // go back using prevCursor
await source.reset(); // clear cursors and refetch from the start
```

`next()` and `prev()` are no-ops if there is no cursor in that direction. There is no page number concept; navigation is always cursor-relative.

---

## Infinite Source

`createInfiniteSource()` accumulates pages in `all` as the user loads more. Searching resets the accumulator and starts fresh from page 1.

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
console.log(source.all);          // first page
console.log(source.meta.hasMore); // true if more pages exist

await source.loadMore();          // fetches page 2 and appends to source.all
await source.loadMore();          // fetches page 3, appends again

await source.reset();             // clear all, restart from page 1
```

`loadMore()` is a no-op when `source.all.length >= source.meta.totalItems`.

---

## Read Model

Every source exposes a consistent read interface.

```ts
// Page-based sources (local, remote)
source.current  // readonly T[] — items on the current page
source.meta     // SourceMeta — pagination and status snapshot

// Infinite source
source.all      // readonly T[] — all accumulated items
source.meta     // InfiniteMeta

// Cursor source
source.current  // readonly T[] — items on the current cursor page
source.meta     // CursorMeta
```

### `SourceMeta`

```ts
type SourceMeta = {
  errorMessage: string | null;
  isLoading: boolean;
  isSearchPending: boolean;
  itemEnd: number;      // 1-based index of the last item on this page (0 if empty)
  itemStart: number;    // 1-based index of the first item on this page (0 if empty)
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
};
```

`meta` is replaced with a new object reference on every change. Both `current`/`all` and `meta` are stable references between changes — safe to compare with `===` to detect updates.

---

## Subscriptions

All sources expose a framework-agnostic `subscribe` method that returns an unsubscribe function.

```ts
const unsubscribe = source.subscribe(() => {
  // fires after every state change
  render(source.current, source.meta);
});

// later
unsubscribe();
```

---

## Ripple Signal Adapters

Wrap any source in Ripple reactive signals with `toSignals()`, `toCursorSignals()`, or `toInfiniteSignals()`.

```ts
import { effect } from '@vielzeug/ripple';
import { toSignals } from '@vielzeug/sourcerer';

const source = createLocalSource(data, { limit: 10 });
const { current, meta, dispose } = toSignals(source);

// current and meta are ComputedSignal — they update automatically
effect(() => {
  console.log('Page:', meta.value.pageNumber, '— items:', current.value.length);
});

await source.goTo(2); // effect re-runs automatically

// When done, release all reactive resources
dispose();
```

```ts
import { toCursorSignals } from '@vielzeug/sourcerer';

const { current, meta, dispose } = toCursorSignals(cursorSource);
```

```ts
import { toInfiniteSignals } from '@vielzeug/sourcerer';

const { all, meta, dispose } = toInfiniteSignals(infiniteSource);
```

> Always call `dispose()` when the source is no longer needed. It unsubscribes from the source and releases the computed signals and their internal tick signal.

---

## URL Query Param Sync

Serialize source state to URL params and restore it on page load.

```ts
import { decodeQuery, encodeQuery } from '@vielzeug/sourcerer';

// Serialize current state
const params = encodeQuery(source.toQuery());
// -> { page: '2', limit: '25', search: 'ada', filter: '{"role":"admin"}' }

// Restore from URL params (e.g. new URLSearchParams(location.search))
const query = decodeQuery(
  Object.fromEntries(new URLSearchParams(location.search)),
  { defaultLimit: 25 },
);
await source.restore(query);
```

`decodeQuery` is fault-tolerant: malformed `filter`/`sort` JSON is silently dropped. Pass `{ strict: true }` to throw instead.

---

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
      <ul>{current.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
      <button onClick={() => source.prev()} disabled={meta.pageNumber <= 1}>Prev</button>
      <button onClick={() => source.next()} disabled={meta.pageNumber >= meta.pageCount}>Next</button>
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

---

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

Use `toSignals()` to expose source state as computed signals, then drive updates from `effect()`.

```ts
import { effect, store } from '@vielzeug/ripple';
import { createLocalSource, toSignals } from '@vielzeug/sourcerer';

const source = createLocalSource(users, { limit: 10 });
const { current, meta, dispose } = toSignals(source);
const controls = store({ query: '' });

effect(() => { void source.searchNow(controls.value.query); });
// current and meta update automatically when query changes
```

---

## Best Practices

- Use `update()` instead of chained individual setters — one fetch, one notification.
- Use `searchNow()` for form submit actions; use `search()` (debounced) for keypress flows.
- Pass the `AbortSignal` from the `fetch` callback to your HTTP client so superseded requests are cancelled.
- Call `ready()` in server-side rendering or test `await`s — not in every render.
- Always call `dispose()` on signal adapters returned by `toSignals()` when the UI is torn down.
- For URL sync, prefer `decodeQuery` + `restore()` over manually reconstructing source state from params.
