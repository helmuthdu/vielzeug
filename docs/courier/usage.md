---
title: Courier — Usage Guide
description: Use one Courier client for HTTP, explicit cached reads, direct mutations, and abortable streams.
---

[[toc]]

## Basic Usage

Create one Courier client for an application or request scope. Its transport policy and disposal lifecycle apply
to every request, cache entry, mutation, and stream.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com', query: { staleTime: 30_000 } });
const key = ['users', 1] as const;

await courier.queries.fetch({
  key,
  fetch: ({ signal }) => courier.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});
console.log(courier.queries.get<User>(key)?.name);
```

## HTTP Requests

Use root methods for REST requests. Courier encodes path parameters, serializes plain-object bodies, and parses
successful response bodies. Each direct HTTP call is independent; use a query key when concurrent cached reads
should share work.

```ts
const posts = await courier.get<{ id: number; title: string }[]>('/users/{id}/posts', {
  params: { id: 1 },
  query: { limit: 20, status: 'published' },
});

await courier.patch('/posts/{id}', {
  body: { title: 'Updated title' },
  params: { id: posts[0].id },
});
```

Call `courier.setHeaders({ authorization: 'Bearer token' })` to update subsequent calls.

## Interceptors

Interceptors apply to HTTP and streaming requests. Register a policy once, then remove it when its containing
scope ends.

```ts
import { withBearerAuth, withRequestId } from '@vielzeug/courier';

const removeAuth = courier.use(withBearerAuth(async () => sessionStorage.getItem('access-token') ?? ''));
const removeRequestId = courier.use(withRequestId());

removeRequestId();
removeAuth();
```

Use `withLogging()` with an explicit `logger` function to log requests during local development. `withLogging()`
includes full URLs, so sanitize query values before persistent logging.

```ts
import { withLogging } from '@vielzeug/courier';

courier.use(withLogging({ logger: (msg) => console.log(msg) }));
```

## Cached Queries

Pass a stable key and fetch definition to `queries.fetch()`. The cache owns data, snapshots, subscriptions, and
in-flight deduplication for that key. Entries with no subscribers are garbage-collected after `gcTime` (default
5 min; `Infinity` disables).

```ts
const key = ['profile', 1] as const;
const definition = {
  key,
  fetch: ({ signal }) => courier.get<{ id: number; name: string }>('/profile/{id}', { params: { id: 1 }, signal }),
  staleTime: 60_000,
};

const stop = courier.queries.subscribe(key, () => {
  const state = courier.queries.getSnapshot<{ id: number; name: string }>(key);
  if (state?.status === 'success') console.log(state.data.name);
  if (state?.status === 'error') console.error(state.error);
});

await courier.queries.fetch(definition);
stop();
```

`queries.fetch(definition)` reuses fresh data. Pass `{ force: true }` to fetch regardless of freshness.
`invalidate(prefix, { refetch: true })` marks matching key prefixes stale and refetches them in the background
in a single call.

## Direct Mutations

Use `mutate()` for a write operation. Pass `invalidateKeys` to invalidate and refetch cache entries after a
successful write — no manual `invalidate()` + refetch boilerplate. Use `onSuccess` for custom cache writes
(e.g. seeding a created entity). Courier never retries writes: retry only operations your application can prove
idempotent.

```ts
type User = { id: number; name: string };

const created = await courier.mutate<User>({
  request: ({ signal }) => courier.post<User>('/users', { body: { name: 'Ada' }, signal }),
  onSuccess: (user, queries) => queries.set(['users', user.id], user),
  invalidateKeys: [['users']],
});

console.log(created.id);
```

Pass an external `signal` when caller owns cancellation. Keep pending and error UI state in framework that owns
that UI.

## Server-Sent Events

`events()` returns an abortable `AsyncIterableIterator`. Breaking loop, calling `return()`, aborting a provided
signal, or disposing client stops its request immediately. Courier sends `Accept: text/event-stream` and
`Cache-Control: no-cache` by default; pass headers to override either value.

```ts
type Notification = { text: string };

for await (const event of courier.events<Notification>('/events')) {
  if (event.event !== 'message') continue;
  console.log(event.data.text);
  break;
}
```

Courier parses valid JSON event data and otherwise returns text. It does not reconnect automatically or retain
SSE event IDs; application owns reconnect policy.

## HTTP Streaming

Use `read()` for text chunks or NDJSON records.

```ts
type ChatChunk = { done: boolean; delta: string };

for await (const chunk of courier.read<ChatChunk>('/chat', {
  body: { prompt: 'Explain cached queries.' },
  method: 'POST',
  parse: 'ndjson',
})) {
  console.log(chunk.delta);
  if (chunk.done) break;
}
```

Streams have no timeout unless `timeout` is supplied. HTTP, network, timeout, and cancellation failures use
Courier error classes; starting a stream after disposal throws `CourierDisposedError`.

## Framework Integration

Create Courier at application or route boundary. Views read a key snapshot synchronously, subscribe during
their lifecycle, and let framework own rendering state.

::: code-group

```tsx [React]
import { useEffect, useSyncExternalStore } from 'react';
import { createCourier } from '@vielzeug/courier';
import type { AsyncState, QueryDefinition } from '@vielzeug/courier';

type User = { id: number; name: string };

export function Profile({ courier, definition }: { courier: ReturnType<typeof createCourier>; definition: QueryDefinition<User> }) {
  const state = useSyncExternalStore(
    (listener) => courier.queries.subscribe(definition.key, listener),
    () => courier.queries.getSnapshot<User>(definition.key),
    () => courier.queries.getSnapshot<User>(definition.key),
  ) as AsyncState<User> | null;

  useEffect(() => void courier.queries.fetch(definition), [courier, definition]);

  if (!state || state.status === 'loading') return <p>Loading...</p>;
  if (state.status === 'error') return <p role="alert">{state.error.message}</p>;
  return <p>{state.data.name}</p>;
}
```

```ts [Vue 3]
import { onMounted, onUnmounted, ref } from 'vue';
import { createCourier } from '@vielzeug/courier';
import type { AsyncState, QueryDefinition } from '@vielzeug/courier';

type User = { id: number; name: string };

export function useProfile(courier: ReturnType<typeof createCourier>, definition: QueryDefinition<User>) {
  const state = ref<AsyncState<User> | null>(courier.queries.getSnapshot(definition.key));
  const unsubscribe = courier.queries.subscribe(definition.key, () => {
    state.value = courier.queries.getSnapshot(definition.key);
  });

  onMounted(() => void courier.queries.fetch(definition));
  onUnmounted(unsubscribe);

  return { state };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createCourier } from '@vielzeug/courier';
  import type { AsyncState, QueryDefinition } from '@vielzeug/courier';

  type User = { id: number; name: string };

  export let courier: ReturnType<typeof createCourier>;
  export let definition: QueryDefinition<User>;
  let state: AsyncState<User> | null = courier.queries.getSnapshot(definition.key);

  onMount(() => {
    const unsubscribe = courier.queries.subscribe(definition.key, () => (state = courier.queries.getSnapshot(definition.key)));
    void courier.queries.fetch(definition);
    return unsubscribe;
  });
</script>

{#if state?.status === 'success'}
  <p>{state.data.name}</p>
{/if}
```

:::

Courier exposes no framework-specific loading or error store. Render `AsyncState` in framework that owns view.

## Working with Other Vielzeug Libraries

### Flux

Use Flux when cache snapshots or SSE events need filtering, composition, or subscription lifecycle separate from
UI framework. Pass cache and query definition to `fromQuery()`.

```ts
import { fromQuery } from '@vielzeug/flux/courier';

const profile = {
  key: ['profile'] as const,
  fetch: ({ signal }: { signal: AbortSignal }) => courier.get<{ id: number; name: string }>('/profile', { signal }),
};
const profile$ = fromQuery(courier.queries, profile);

void courier.queries.fetch(profile);

const profileSubscription = profile$.subscribe((state) => console.log(state?.status));

profileSubscription.unsubscribe();
```

### Ripple

Use a Ripple signal when Courier data must participate in fine-grained reactive state outside a component. Mirror
only cache snapshot into signal.

```ts
import { signal } from '@vielzeug/ripple';

const key = ['profile', 1] as const;
const profileState = signal(courier.queries.getSnapshot<{ id: number; name: string }>(key));
const unsubscribe = courier.queries.subscribe(key, () => (profileState.value = courier.queries.getSnapshot(key)));

await courier.queries.fetch({
  key,
  fetch: ({ signal }) => courier.get('/profile/{id}', { params: { id: 1 }, signal }),
});

unsubscribe();
```

## Gotchas

### `mutate()` runs `onSuccess` before `invalidateKeys`

`mutate()` executes in order: `request` → `onSuccess` → `invalidateKeys`. If `onSuccess` calls `queries.set()` for a key also in `invalidateKeys`, the seeded data is overwritten by the background refetch. This is correct — `invalidateKeys` means "refetch to confirm" — but the order matters when `onSuccess` seeds optimistic data that `invalidateKeys` then replaces.

### Optimistic rollback should use `getSnapshot()`, not `get()`

`queries.get()` only returns successful data and drops snapshot metadata (`status`, `error`, `updatedAt`). It also cannot distinguish a missing entry from a successful cached value of `undefined`. For optimistic rollback, capture `getSnapshot()` first so you can restore prior success data with `updatedAt`, or `delete(key)` when no previous success snapshot existed.

### `baseUrl` should not include query parameters

`buildUrl` joins `baseUrl` and path with `/`. A base URL like `https://api.example.com?token=abc` produces broken URLs (`https://api.example.com?token=abc/users`). Pass query parameters per-request via `config.query` instead.

### Background refetch after error transitions through `loading`

When `invalidate({ refetch: true })` triggers a background refetch on an error-state entry, the snapshot transitions to `loading` (losing the previous error). Consumers building "error + retrying" UI should track retry state separately — `AsyncState` has no `error` with `isFetching: true` variant.

## Best Practices

- Create one Courier client per application or SSR request scope.
- Use stable, complete cache keys for every cached response identity.
- Fetch through `queries.fetch()` when work should deduplicate and cache.
- Use `invalidateKeys` on mutations to refetch affected cache entries in one step.
- Keep retries outside mutations until operation idempotency is proven.
- Dispose only at final application or request boundary.
- Keep credentials out of URLs when using logging interceptors.
