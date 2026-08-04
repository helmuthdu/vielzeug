---
title: Courier — Usage Guide
description: Use one Courier client for HTTP, cached reads, direct mutations, and abortable streams.
---

[[toc]]

## Basic Usage

Create one Courier client for an application or request scope. Its transport policy and disposal lifecycle
apply to every request, query, mutation, and stream.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com', query: { staleTime: 30_000 } });
const user = await courier.get<User>('/users/{id}', { params: { id: 1 } });
console.log(user.name);
```

## HTTP Requests

Use root methods for REST requests. Courier encodes path parameters, serializes plain-object bodies, and
parses successful response bodies.

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

GET, HEAD, and OPTIONS calls with the same URL are deduplicated while active. Set `dedupe: false` for an
independent request. Call `courier.headers({ authorization: 'Bearer token' })` to update subsequent calls.

## Interceptors

Interceptors apply to HTTP and streaming requests. Register a policy once, then remove it when its
containing scope ends.

```ts
import { withBearerAuth, withRequestId } from '@vielzeug/courier';

const removeAuth = courier.use(withBearerAuth(async () => sessionStorage.getItem('access-token') ?? ''));
const removeRequestId = courier.use(withRequestId());

removeRequestId();
removeAuth();
```

Use `debugCourier()` from `@vielzeug/courier/devtools` to create a logging-enabled client during local
development. `withLogging()` includes full URLs, so sanitize query values before persistent logging.

## Query Handles

Define a key and a fetch function once. The resulting handle exposes its current `AsyncState`, not a
framework-specific store.

```ts
const profile = courier.queries.create<{ id: number; name: string }>({
  key: ['profile', 1],
  fetch: ({ signal }) => courier.get('/profile/{id}', { params: { id: 1 }, signal }),
  staleTime: 60_000,
});

const stop = profile.subscribe(() => {
  const state = profile.getSnapshot();
  if (state.status === 'success') console.log(state.data.name);
  if (state.status === 'error') console.error(state.error);
});

await profile.fetch();
stop();
```

`fetch()` reuses fresh data; `refetch()` always runs the fetch function. `invalidate()` marks matching
keys stale but does not fetch. Call `courier.queries.refetchStale()` when visible data must refresh now.

## Direct Mutations

Use `mutate()` for a write operation and update the cache in `onSuccess`.

```ts
type User = { id: number; name: string };

const created = await courier.mutate({
  request: ({ signal }) => courier.post<User>('/users', { body: { name: 'Ada' }, signal }),
  onSuccess: (user, queries) => {
    queries.set(['users', user.id], user);
    queries.invalidate(['users']);
    queries.refetchStale();
  },
});

console.log(created.id);
```

Pass `times` to retry an individual operation. Pass an external `signal` when the caller owns
cancellation. Keep pending and error UI state in the framework that owns that UI.

## Server-Sent Events

`events()` returns an abortable `AsyncIterableIterator`. Breaking the loop, calling `return()`, aborting a
provided signal, or disposing the client stops its request immediately.
Courier sends `Accept: text/event-stream` and `Cache-Control: no-cache` by default; pass headers to
override either value when your endpoint requires a different policy.

```ts
type Notification = { text: string };

for await (const event of courier.events<Notification>('/events')) {
  if (event.event !== 'message') continue;
  console.log(event.data.text);
  break;
}
```

Courier parses valid JSON event data and otherwise returns text. It does not reconnect automatically, so
the application owns retry policy.

## HTTP Streaming

Use `read()` for text chunks or NDJSON records.

```ts
type ChatChunk = { done: boolean; delta: string };

for await (const chunk of courier.read<ChatChunk>('/chat', {
  body: { prompt: 'Explain query handles.' },
  method: 'POST',
  parse: 'ndjson',
})) {
  console.log(chunk.delta);
  if (chunk.done) break;
}
```

Streams have no timeout unless `timeout` is supplied. HTTP, network, timeout, and cancellation failures
are reported with Courier error classes; starting a stream after disposal throws `CourierDisposedError`.

## Framework Integration

Create Courier and its query handles at the application or route boundary. Views should read a snapshot
synchronously, subscribe during their lifecycle, and let the framework own rendering state. Call `fetch()`
when the view becomes active; it returns fresh cached data without starting a second request.

::: code-group

```tsx [React]
import { useEffect, useSyncExternalStore } from 'react';
import type { AsyncState, Query } from '@vielzeug/courier';

type User = { id: number; name: string };

export function Profile({ profile }: { profile: Query<User> }) {
  const state: AsyncState<User> = useSyncExternalStore(profile.subscribe, profile.getSnapshot, profile.getSnapshot);

  useEffect(() => {
    void profile.fetch();
  }, [profile]);

  if (state.status === 'loading') return <p>Loading...</p>;
  if (state.status === 'error') return <p role="alert">{state.error.message}</p>;
  return <p>{state.data.name}</p>;
}
```

```ts [Vue 3]
import { onMounted, onUnmounted, ref } from 'vue';
import type { AsyncState, Query } from '@vielzeug/courier';

type User = { id: number; name: string };

export function useProfile(profile: Query<User>) {
  const state = ref<AsyncState<User>>(profile.getSnapshot());
  const unsubscribe = profile.subscribe(() => {
    state.value = profile.getSnapshot();
  });

  onMounted(() => void profile.fetch());
  onUnmounted(unsubscribe);

  return { state };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import type { AsyncState, Query } from '@vielzeug/courier';

  type User = { id: number; name: string };

  export let profile: Query<User>;
  let state: AsyncState<User> = profile.getSnapshot();

  onMount(() => {
    const unsubscribe = profile.subscribe(() => (state = profile.getSnapshot()));
    void profile.fetch();
    return unsubscribe;
  });
</script>

{#if state.status === 'success'}
  <p>{state.data.name}</p>
{/if}
```

:::

Courier exposes no framework-specific loading or error store. Render `AsyncState` in the framework that
owns the view, and do not dispose a shared query handle during an individual component unmount.

## Working with Other Vielzeug Libraries

### Flux

Use Flux when query snapshots or SSE events need filtering, composition, or a subscription lifecycle
separate from the UI framework. Unsubscribing from `fromSse()` calls the underlying iterator's `return()`,
which closes Courier's stream request immediately.

```ts
import { fromQuery, fromSse } from '@vielzeug/flux/courier';
import { createCourier } from '@vielzeug/courier';

type Notification = { text: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const profile = courier.queries.create({
  key: ['profile'],
  fetch: ({ signal }) => courier.get('/profile', { signal }),
});
const profile$ = fromQuery(profile);
const notifications$ = fromSse(courier.events<Notification>('/events'), 'message');

const profileSubscription = profile$.subscribe((state) => console.log(state.status));
const notificationSubscription = notifications$.subscribe((notification) => console.log(notification.text));

notificationSubscription.unsubscribe(); // Calls iterator.return() and aborts the SSE request.
profileSubscription.unsubscribe();
```

### Ripple

Use a Ripple signal when Courier data must participate in fine-grained reactive state outside a component.
Keep the query as the source of truth and mirror only its snapshot into the signal.

```ts
import { createCourier, type AsyncState } from '@vielzeug/courier';
import { effect, signal } from '@vielzeug/ripple';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const profile = courier.queries.create<User>({
  key: ['profile'],
  fetch: ({ signal }) => courier.get('/profile', { signal }),
});
const profileState = signal<AsyncState<User>>(profile.getSnapshot());
const unsubscribe = profile.subscribe(() => (profileState.value = profile.getSnapshot()));
const logger = effect(() => console.log(profileState.value.status));

await profile.fetch();
unsubscribe();
logger.dispose();
```

### Spell

Pass a Spell schema to `schema` when an endpoint must validate its parsed payload before it enters the
cache or view state. Courier wraps validation failures in `CourierSchemaValidationError` and preserves the
unvalidated payload on `error.data`.

```ts
import { createCourier } from '@vielzeug/courier';
import { s, type Infer } from '@vielzeug/spell';

const User = s.object({
  id: s.number().integer(),
  name: s.string().min(1),
});
type User = Infer<typeof User>;

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const user = await courier.get<User>('/users/{id}', {
  params: { id: 1 },
  schema: User,
});

console.log(user.name);
```

## Best Practices

- Create one Courier client per application or server request scope.
- Keep query keys stable and represent the data they identify.
- Call `refetch()` for polling and `refetchStale()` after invalidation when the UI must update.
- Pass query signals through to every cancellable data source.
- Treat `CourierAbortError` as normal control flow when users navigate away.
- Break stream loops when the consumer no longer needs data.
- Dispose client scopes deterministically during application shutdown.
