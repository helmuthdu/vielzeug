---
title: Fetchit — Examples
description: Real-world patterns for the Fetchit HTTP client, query client, and standalone mutations.
---

## Fetchit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Framework Integration

Complete examples showing how to integrate Fetchit with React, Vue, Svelte, and Web Components. All patterns use `createApi` for HTTP and `createQuery` + `createMutation` for data management.

### Basic Integration (Inline)

::: code-group

```tsx [React]
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

function UserProfile({ userId }: { userId: number }) {
  const [state, setState] = useState<QueryState<User>>(
    () =>
      qc.getState<User>(['users', userId]) ?? {
        data: undefined,
        error: null,
        status: 'idle',
        updatedAt: 0,
        isPending: false,
        isSuccess: false,
        isError: false,
        isIdle: true,
      },
  );

  useEffect(() => {
    const unsub = qc.subscribe<User>(['users', userId], setState);
    qc.query({
      key: ['users', userId],
      fn: ({ signal }) => api.get('/users/{id}', { params: { id: userId }, signal }),
    }).catch(() => {});
    return unsub;
  }, [userId]);

  if (state.isPending) return <div>Loading…</div>;
  if (state.isError) return <div>Error: {state.error!.message}</div>;
  if (!state.data) return <div>Not found</div>;
  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createApi, createQuery } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ userId: number }>();
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

const state = ref({ data: null as User | null, isPending: false, error: null as Error | null });
let unsub: (() => void) | undefined;

onMounted(() => {
  unsub = qc.subscribe<User>(['users', props.userId], (s) => {
    state.value = { data: s.data ?? null, isPending: s.isPending, error: s.error };
  });
  qc.query({
    key: ['users', props.userId],
    fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: props.userId }, signal }),
  }).catch(() => {});
});

onUnmounted(() => unsub?.());
</script>

<template>
  <div v-if="state.isPending">Loading…</div>
  <div v-else-if="state.error">Error: {{ state.error.message }}</div>
  <div v-else-if="state.data">{{ state.data.name }}</div>
  <div v-else>Not found</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createApi, createQuery } from '@vielzeug/fetchit';
  import { onDestroy } from 'svelte';

  export let userId: number;

  const api = createApi({ baseUrl: 'https://api.example.com' });
  const qc  = createQuery({ staleTime: 5_000 });

  let data: User | undefined;
  let isPending = true;
  let error: Error | null = null;

  const unsub = qc.subscribe<User>(['users', userId], (s) => {
    data = s.data; isPending = s.isPending; error = s.error;
  });

  qc.query({
    key: ['users', userId],
    fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
  }).catch(() => {});

  onDestroy(unsub);
</script>

{#if isPending}
  <div>Loading…</div>
{:else if error}
  <div>Error: {error.message}</div>
{:else if data}
  <div>{data.name}</div>
{:else}
  <div>Not found</div>
{/if}
```

```ts [Web Component]
import { createApi, createQuery } from '@vielzeug/fetchit';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

class UserCard extends HTMLElement {
  #unsub?: () => void;

  connectedCallback() {
    const id = Number(this.getAttribute('user-id'));
    this.#unsub = qc.subscribe<User>(['users', id], (state) => this.#render(state));
    qc.query({ key: ['users', id], fn: ({ signal }) => api.get('/users/{id}', { params: { id }, signal }) }).catch(
      () => {},
    );
  }
  disconnectedCallback() {
    this.#unsub?.();
  }

  #render(state: QueryState<User>) {
    this.innerHTML = state.isPending
      ? '<p>Loading…</p>'
      : state.error
        ? `<p>Error: ${state.error.message}</p>`
        : state.data
          ? `<p>${state.data.name}</p>`
          : '<p>Not found</p>';
  }
}
customElements.define('user-card', UserCard);
```

:::

### Reusable Hook/Composable

::: code-group

```tsx [React hook]
// hooks/useQuery.ts
import { createApi, createQuery, type QueryState } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

export function useUser(userId: number) {
  const [state, setState] = useState<QueryState<User>>(
    () =>
      qc.getState<User>(['users', userId]) ?? {
        data: undefined,
        error: null,
        status: 'idle',
        updatedAt: 0,
        isPending: false,
        isSuccess: false,
        isError: false,
        isIdle: true,
      },
  );

  useEffect(() => {
    const unsub = qc.subscribe<User>(['users', userId], setState);
    qc.query({
      key: ['users', userId],
      fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
    }).catch(() => {});
    return unsub;
  }, [userId]);

  return state;
}

// UserProfile.tsx
function UserProfile({ userId }: { userId: number }) {
  const { data, isPending, error } = useUser(userId);
  if (isPending) return <div>Loading…</div>;
  if (error) return <div>Error: {error.message}</div>;
  return data ? <div>{data.name}</div> : <div>Not found</div>;
}
```

```ts [Vue composable]
// composables/useUser.ts
import { createApi, createQuery } from '@vielzeug/fetchit';
import { ref, onScopeDispose, type Ref } from 'vue';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

export function useUser(userId: number) {
  const data = ref<User | null>(null);
  const isPending = ref(true);
  const error = ref<Error | null>(null);

  const unsub = qc.subscribe<User>(['users', userId], (s) => {
    data.value = s.data ?? null;
    isPending.value = s.isPending;
    error.value = s.error;
  });

  qc.query({
    key: ['users', userId],
    fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
  }).catch(() => {});

  onScopeDispose(unsub);
  return { data, isPending, error };
}
```

:::

## CRUD Operations

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

// READ — cached
const users = await qc.query({
  key: ['users'],
  fn: ({ signal }) => api.get<User[]>('/users', { signal }),
});

// READ one
const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

// CREATE
const addUser = createMutation((data: NewUser) => api.post<User>('/users', { body: data }), {
  onSuccess: (user) => {
    qc.set(['users', user.id], user);
    qc.invalidate(['users']);
  },
});
await addUser.mutate({ name: 'Alice', email: 'alice@example.com' });

// UPDATE
const updateUser = createMutation(
  ({ id, ...patch }: { id: number } & Partial<User>) => api.put<User>('/users/{id}', { params: { id }, body: patch }),
  { onSuccess: (user) => qc.set(['users', user.id], user) },
);
await updateUser.mutate({ id: 1, name: 'Alice Smith' });

// DELETE
const deleteUser = createMutation((id: number) => api.delete(`/users/${id}`), {
  onSuccess: (_, id) => qc.invalidate(['users']),
});
await deleteUser.mutate(1);
```

## Authentication

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

function login(token: string) {
  api.headers({ Authorization: `Bearer ${token}` });
}

function logout() {
  api.headers({ Authorization: undefined }); // remove header
  qc.clear(); // clear cached authenticated data
}
```

### Auto Token Refresh via Interceptor

```ts
const dispose = api.use(async (ctx, next) => {
  try {
    return await next(ctx);
  } catch (err) {
    if (HttpError.is(err, 401)) {
      const newToken = await refreshToken();
      api.headers({ Authorization: `Bearer ${newToken}` });
      // Retry with updated header
      ctx.init.headers = { ...(ctx.init.headers as object), Authorization: `Bearer ${newToken}` };
      return next(ctx);
    }
    throw err;
  }
});
```

## Optimistic Updates

```ts
const userId = 1;
const key = ['users', userId];

const updateUser = createMutation((patch: Partial<User>) =>
  api.put<User>('/users/{id}', { params: { id: userId }, body: patch }),
);

// Apply optimistic update immediately
qc.set<User>(key, (old) => ({ ...old!, ...patch }));

try {
  await updateUser.mutate(patch);
  // Server confirmed — force sync
  qc.invalidate(key);
} catch {
  // Server rejected — roll back
  qc.invalidate(key);
}
```

## Polling

```ts
const qc = createQuery({ staleTime: 0 }); // always stale so each call hits the server

function startPolling(key: QueryKey, fn: QueryOptions<unknown>['fn'], intervalMs: number) {
  const tick = async () => {
    qc.invalidate(key);
    await qc.query({ key, fn }).catch(() => {});
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

const stopPolling = startPolling(
  ['job', jobId],
  ({ signal }) => api.get<Job>('/jobs/{id}', { params: { id: jobId }, signal }),
  3_000,
);

// Stop when job completes
qc.subscribe<Job>(['job', jobId], (state) => {
  if (state.data?.status === 'done') stopPolling();
});
```

## Error Handling Patterns

### Status-code branching

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404)) return null;
  if (HttpError.is(err, 401)) return redirectToLogin();
  if (HttpError.is(err, 403)) return showForbidden();
  if (HttpError.is(err)) throw new Error(`Unexpected ${err.status}: ${err.url}`);
  throw err; // re-throw non-HTTP errors
}
```

### Global error logger

```ts
const api = createApi({
  baseUrl: 'https://api.example.com',
  logger: (level, msg, meta) => {
    if (level === 'error') Sentry.captureMessage(msg, { extra: { meta } });
    else if (level === 'warn') console.warn(msg);
  },
});
```

### Mutation error state

```ts
const mutation = createMutation((id: number) => api.delete(`/users/${id}`));

mutation.subscribe((state) => {
  if (state.isError) {
    // State is observable — no need for try/catch in UI
    toast.error(state.error!.message);
    mutation.reset();
  }
});

mutation.mutate(1).catch(() => {}); // error is surfaced via state, not thrown
```

## File Uploads

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });

// Single file — FormData passes through without JSON serialization
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('alt', 'Profile photo');

const result = await api.post<UploadResult>('/upload', { body: form });

// Multiple files
const batch = new FormData();
for (const file of files) batch.append('files', file);
await api.post('/upload/batch', { body: batch });
```

## Disposal

```ts
// Using declarations (TypeScript 5.2+)
{
  using api = createApi({ baseUrl: 'https://api.example.com' });
  using qc = createQuery();
  // Automatically disposed at end of block
}

// Manual disposal — good for singleton cleanup on logout
function cleanup() {
  api.dispose();
  qc.dispose();
}
```

## Query Callbacks

Per-call `onSuccess`, `onError`, and `onSettled` callbacks fire only when the `query()` call triggers a real network request — not on cache hits or shared inflight promises.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

// Toast notification on success
await qc.query({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
  onSuccess: (user) => toast.success(`Loaded ${user.name}`),
  onError: (err) => toast.error(err.message),
  onSettled: (data, err) => analytics.track('users.load', { ok: !err }),
});

// Only retry server errors — skip 4xx immediately
await qc.query({
  key: ['config'],
  fn: ({ signal }) => api.get('/config', { signal }),
  retry: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});
```

## Mutation Cancel

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

const uploadFile = createMutation(
  (file: File) =>
    api.post<UploadResult>('/upload', {
      body: (() => {
        const f = new FormData();
        f.append('file', file);
        return f;
      })(),
    }),
  { onSuccess: () => qc.invalidate(['files']) },
);

// In a component — cancel on unmount to avoid state updates after destruction
uploadFile.mutate(selectedFile);
// ...on unmount:
uploadFile.cancel();

// Or drive cancellation via external signal
const ac = new AbortController();
uploadFile.mutate(selectedFile, { signal: ac.signal });
ac.abort(); // same effect
```
