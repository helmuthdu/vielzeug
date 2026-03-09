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
  const [state, setState] = useState<QueryState<User>>(() => qc.getState<User>(['users', userId]) ?? {
    data: undefined, error: null, status: 'idle',
    updatedAt: 0, isPending: false, isSuccess: false, isError: false, isIdle: true,
  });

  useEffect(() => {
    const unsub = qc.subscribe<User>(['users', userId], setState);
    qc.query({ key: ['users', userId], fn: ({ signal }) => api.get('/users/{id}', { params: { id: userId }, signal }) }).catch(() => {});
    return unsub;
  }, [userId]);

  if (state.isPending) return <div>Loading…</div>;
  if (state.isError)   return <div>Error: {state.error!.message}</div>;
  if (!state.data)     return <div>Not found</div>;
  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createApi, createQuery } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ userId: number }>();
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc  = createQuery({ staleTime: 5_000 });

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
const qc  = createQuery({ staleTime: 5_000 });

class UserCard extends HTMLElement {
  #unsub?: () => void;

  connectedCallback() {
    const id = Number(this.getAttribute('user-id'));
    this.#unsub = qc.subscribe<User>(['users', id], (state) => this.#render(state));
    qc.query({ key: ['users', id], fn: ({ signal }) => api.get('/users/{id}', { params: { id }, signal }) }).catch(() => {});
  }
  disconnectedCallback() { this.#unsub?.(); }

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
const qc  = createQuery({ staleTime: 5_000 });

export function useUser(userId: number) {
  const [state, setState] = useState<QueryState<User>>(
    () => qc.getState<User>(['users', userId]) ?? { data: undefined, error: null, status: 'idle', updatedAt: 0, isPending: false, isSuccess: false, isError: false, isIdle: true },
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
  if (error)     return <div>Error: {error.message}</div>;
  return data ? <div>{data.name}</div> : <div>Not found</div>;
}
```

```ts [Vue composable]
// composables/useUser.ts
import { createApi, createQuery } from '@vielzeug/fetchit';
import { ref, onScopeDispose, type Ref } from 'vue';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc  = createQuery({ staleTime: 5_000 });

export function useUser(userId: number) {
  const data     = ref<User | null>(null);
  const isPending = ref(true);
  const error    = ref<Error | null>(null);

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
const qc  = createQuery({ staleTime: 5_000 });

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
const addUser = createMutation(
  (data: NewUser) => api.post<User>('/users', { body: data }),
  { onSuccess: (user) => { qc.set(['users', user.id], user); qc.invalidate(['users']); } },
);
await addUser.mutate({ name: 'Alice', email: 'alice@example.com' });

// UPDATE
const updateUser = createMutation(
  ({ id, ...patch }: { id: number } & Partial<User>) =>
    api.put<User>('/users/{id}', { params: { id }, body: patch }),
  { onSuccess: (user) => qc.set(['users', user.id], user) },
);
await updateUser.mutate({ id: 1, name: 'Alice Smith' });

// DELETE
const deleteUser = createMutation(
  (id: number) => api.delete(`/users/${id}`),
  { onSuccess: (_, id) => qc.invalidate(['users']) },
);
await deleteUser.mutate(1);
```

## Authentication

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc  = createQuery();

function login(token: string) {
  api.headers({ Authorization: `Bearer ${token}` });
}

function logout() {
  api.headers({ Authorization: undefined }); // remove header
  qc.clear();                                // clear cached authenticated data
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

const updateUser = createMutation(
  (patch: Partial<User>) => api.put<User>('/users/{id}', { params: { id: userId }, body: patch }),
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
  if (HttpError.is(err))      throw new Error(`Unexpected ${err.status}: ${err.url}`);
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
  using qc  = createQuery();
  // Automatically disposed at end of block
}

// Manual disposal — good for singleton cleanup on logout
function cleanup() {
  api.dispose();
  qc.dispose();
}
```

::: tip 💡 Complete Applications
These are complete application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, one-off integrations
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Fetchit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a client within components.

::: code-group

```tsx [React]
import { createHttp, createQuery } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

function UserProfile({ userId }: { userId: string }) {
  const [state, setState] = useState({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
      setState({
        data: newState.data ?? null,
        isLoading: newState.isPending,
        error: newState.error,
      });
    });

    queryClient
      .query({
        key: ['users', userId],
        fn: () => http.get<User>(`/users/${userId}`),
        staleTime: 5000,
      })
      .catch(() => {});

    return () => unsubscribe();
  }, [userId]);

  if (state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.data) return <div>User not found</div>;

  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createHttp, createQuery } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ userId: string }>();
const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

const state = ref({
  data: null as User | null,
  isLoading: true,
  error: null as Error | null,
});

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = queryClient.subscribe(['users', props.userId], (newState) => {
    state.value = {
      data: newState.data ?? null,
      isLoading: newState.isPending,
      error: newState.error,
    };
  });

  queryClient
    .query({
      key: ['users', props.userId],
      fn: () => http.get<User>(`/users/${props.userId}`),
      staleTime: 5000,
    })
    .catch(() => {});
});

onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div v-if="state.isLoading">Loading...</div>
  <div v-else-if="state.error">Error: {{ state.error.message }}</div>
  <div v-else-if="!state.data">User not found</div>
  <div v-else>{{ state.data.name }}</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createHttp, createQuery } from '@vielzeug/fetchit';
  import { onDestroy } from 'svelte';

  export let userId: string;

  const http = createHttp({ baseUrl: 'https://api.example.com' });
  const queryClient = createQuery();

  let state = {
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  };

  const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
    state = {
      data: newState.data ?? null,
      isLoading: newState.isPending,
      error: newState.error,
    };
  });

  queryClient
    .query({
      key: ['users', userId],
      fn: () => http.get<User>(`/users/${userId}`),
      staleTime: 5000,
    })
    .catch(() => {});

  onDestroy(unsubscribe);
</script>

{#if state.isLoading}
  <div>Loading...</div>
{:else if state.error}
  <div>Error: {state.error.message}</div>
{:else if !state.data}
  <div>User not found</div>
{:else}
  <div>{state.data.name}</div>
{/if}
```

```ts [Web Component]
import { createHttp, createQuery } from '@vielzeug/fetchit';

class UserCard extends HTMLElement {
  #http = createHttp({ baseUrl: 'https://api.example.com' });
  #queryClient = createQuery();
  #unsubscribe: (() => void) | null = null;

  connectedCallback() {
    const userId = this.getAttribute('user-id') ?? '';
    if (!userId) return;

    this.#unsubscribe = this.#queryClient.subscribe(['users', userId], (state) => {
      this.render(state);
    });

    this.#queryClient
      .query({
        key: ['users', userId],
        fn: () => this.#http.get<User>(`/users/${userId}`),
        staleTime: 5000,
      })
      .catch(() => {});
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }

  render(state: any) {
    this.innerHTML = state.isPending
      ? '<div>Loading...</div>'
      : state.error
        ? `<div>Error: ${state.error.message}</div>`
        : state.data
          ? `<div>${state.data.name}</div>`
          : '<div>User not found</div>';
  }
}

customElements.define('user-card', UserCard);
```

:::

### Advanced Integration (Hook/Composable)

Recommended pattern for reusability and separation of concerns.

::: code-group

```tsx [React]
// useUser.ts
import { createHttp, createQuery } from '@vielzeug/fetchit';
import { useEffect, useMemo, useState } from 'react';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

export function useUser(userId: string) {
  const [state, setState] = useState({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
      setState({
        data: newState.data ?? null,
        isLoading: newState.isPending,
        error: newState.error,
      });
    });

    queryClient
      .query({
        key: ['users', userId],
        fn: () => http.get<User>(`/users/${userId}`),
        staleTime: 5000,
      })
      .catch(() => {});

    return () => unsubscribe();
  }, [userId]);

  return state;
}

// UserProfile.tsx
function UserProfile({ userId }: { userId: string }) {
  const state = useUser(userId);

  if (state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.data) return <div>User not found</div>;

  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
// useUser.ts
import { createHttp, createQuery } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

export function useUser(userId: () => string) {
  const state = ref({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    const id = userId();
    if (!id) return;

    unsubscribe = queryClient.subscribe(['users', id], (newState) => {
      state.value = {
        data: newState.data ?? null,
        isLoading: newState.isPending,
        error: newState.error,
      };
    });

    queryClient
      .query({
        key: ['users', id],
        fn: () => http.get<User>(`/users/${id}`),
        staleTime: 5000,
      })
      .catch(() => {});
  });

  onUnmounted(() => unsubscribe?.());

  return state;
}

// UserProfile.vue
<script setup lang="ts">
const props = defineProps<{ userId: string }>();
const state = useUser(() => props.userId);
</script>

<template>
  <div v-if="state.isLoading">Loading...</div>
  <div v-else-if="state.error">Error: {{ state.error.message }}</div>
  <div v-else-if="!state.data">User not found</div>
  <div v-else>{{ state.data.name }}</div>
</template>
```

```svelte [Svelte]
// userStore.ts
import { createHttp, createQuery } from '@vielzeug/fetchit';
import { writable } from 'svelte/store';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

export function useUser(userId: string) {
  const state = writable({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
    state.set({
      data: newState.data ?? null,
      isLoading: newState.isPending,
      error: newState.error,
    });
  });

  queryClient
    .query({
      key: ['users', userId],
      fn: () => http.get<User>(`/users/${userId}`),
      staleTime: 5000,
    })
    .catch(() => {});

  return { subscribe: state.subscribe, unsubscribe };
}

// +page.svelte
<script lang="ts">
  import { useUser } from './userStore';

  export let data: { id: string };

  const userStore = useUser(data.id);
</script>

{#if $userStore.isLoading}
  <div>Loading...</div>
{:else if $userStore.error}
  <div>Error: {$userStore.error.message}</div>
{:else if !$userStore.data}
  <div>User not found</div>
{:else}
  <div>{$userStore.data.name}</div>
{/if}
```

```ts [Web Component]
// BaseUserElement.ts
import { createHttp, createQuery } from '@vielzeug/fetchit';

export class BaseUserElement extends HTMLElement {
  http = createHttp({ baseUrl: 'https://api.example.com' });
  queryClient = createQuery();

  async fetchUser(userId: string) {
    return this.queryClient.query({
      key: ['users', userId],
      fn: () => this.http.get<User>(`/users/${userId}`),
      staleTime: 5000,
    });
  }

  subscribeToUser(userId: string, listener: (state: any) => void) {
    return this.queryClient.subscribe(['users', userId], listener);
  }
}
```

:::

## Basic CRUD Operations with HTTP Client

### GET Request

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({
  baseUrl: 'https://api.example.com',
});

interface User {
  id: string;
  name: string;
  email: string;
}

// Returns data directly
const user = await http.get<User>('/users/1');
console.log(user.name); // Direct access
console.log(user.email);
```

### POST Request

```ts
const user = await http.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});

console.log('Created user:', user); // Direct access
```

### PUT Request

```ts
const user = await http.put<User>('/users/1', {
  body: {
    name: 'Alice Smith',
    email: 'alice.smith@example.com',
  },
});

console.log('Updated user:', user);
```

### PATCH Request

```ts
const user = await http.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});

console.log('Updated email:', user.email);
```

### DELETE Request

```ts
await http.delete('/users/1');
// Returns void or deletion confirmation
```

## Authentication

::: warning 🔐 Security Best Practices

- Never store tokens in localStorage (use httpOnly cookies when possible)
- Implement token refresh logic
- Clear cache on logout to prevent data leaks
- Always validate tokens on the server-side
  :::

### Setting Auth Headers

```ts
const http = createHttp({
  baseUrl: 'https://api.example.com',
});

// After login
function login(token: string) {
  http.headers({
    Authorization: `Bearer ${token}`,
  });
}

// On logout
function logout() {
  http.headers({
    Authorization: undefined, // Removes the header
  });
  queryClient.clear(); // Clear cached authenticated data
}
```

### Auth Token Refresh

```ts
import { HttpError, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

async function apiRequest<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, options?: any): Promise<T> {
  try {
    return await http[method]<T>(url, options);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshAuthToken();
      http.headers({ Authorization: `Bearer ${newToken}` });

      // Retry the request
      return await http[method]<T>(url, options);
    }
    throw error;
  }
}
```

## Cache Management

### Query Keys

```ts
import { createHttp, createQuery } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

// Use query keys for better cache control
const user = await queryClient.query({
  key: ['users', '1'],
  fn: () => http.get<User>('/users/1'),
});

// Later, invalidate this specific query
queryClient.invalidate(['users', '1']);
```

### Request Deduplication

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });

// HTTP client automatically deduplicates identical concurrent requests
const [user1, user2, user3] = await Promise.all([
  http.get<User>('/users/1'),
  http.get<User>('/users/1'),
  http.get<User>('/users/1'),
]);

console.log(user1 === user2); // true (same instance)
```

### Force Refresh

```ts
// Invalidate cache first, then fetch fresh data
queryClient.invalidate(['users', '1']);
const freshUser = await queryClient.query({
  key: ['users', '1'],
  fn: () => http.get<User>('/users/1'),
});
```

### Cache Cleanup

```ts
// Clear all cached queries
queryClient.clear();
```

// Invalidate all user queries (pattern matching)
queryClient.invalidate(['users']);

// Check cache size
console.log(`Cache contains ${size} entries`);

````text

## URL Building

### Query String Parameters

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });

// Use query option for query string parameters
const users = await http.get<User[]>('/api/users', {
  query: {
    page: 1,
    limit: 10,
    sort: 'name',
    active: true,
  },
});
// Actual request: "/api/users?page=1&limit=10&sort=name&active=true"
````

### Dynamic URLs

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });

// Using path parameters
function getUser(id: string) {
  return http.get<User>('/users/{id}', {
    params: { id },
  });
}

// Using query string parameters for search
function searchUsers(query: string, page: number) {
  return http.get<User[]>('/users/search', {
    query: { q: query, page },
  });
}

// Combining both
function getUserPosts(userId: string, status: string, limit: number) {
  return http.get<Post[]>('/users/{userId}/posts', {
    params: { userId },
    query: { status, limit },
  });
}
```

## File Uploads

### Single File Upload

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });

const fileInput = document.querySelector<HTMLInputElement>('#file');
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Profile picture');

await http.post('/upload', {
  body: formData,
  // Content-Type is set automatically
});
```

### Multiple Files

```ts
const formData = new FormData();
for (const file of files) {
  formData.append('files[]', file);
}

await http.post('/upload/multiple', {
  body: formData,
});
```

### Progress Tracking

```ts
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  console.log(`Upload progress: ${percent}%`);
});

// For progress tracking, you may need to use XMLHttpRequest
// Fetchit focuses on simplicity over advanced upload features
```

## Error Handling

### Basic Error Handling

```ts
import { HttpError, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

try {
  const user = await http.get<User>('/users/1');
  console.log(user);
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} failed`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
  } else {
    console.error('Network error:', error);
  }
}
```

### Status Code Handling

```ts
import { HttpError } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

try {
  await http.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 404:
        console.error('User not found');
        break;
      case 401:
        console.error('Not authenticated');
        redirectToLogin();
        break;
      case 403:
        console.error('No permission');
        break;
      default:
        console.error('Request failed');
    }
  }
}
```

### Global Error Handler

```ts
import { HttpError, createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

async function safeRequest<T>(requestFn: () => Promise<T>): Promise<T | null> {
  try {
    return await requestFn();
  } catch (error) {
    if (error instanceof HttpError) {
      // Log to error tracking service
      trackError({
        url: error.url,
        method: error.method,
        status: error.status,
        message: error.message,
      });

      // Show user-friendly message
      showNotification('Something went wrong. Please try again.');
    }
    return null;
  }
}

// Usage
const user = await safeRequest(() => http.get<User>('/users/1'));
```

## Advanced Patterns

### Retry Logic

Fetchit uses [@vielzeug/toolkit's retry()](../toolkit/examples/function/retry.md) utility for intelligent retry logic with exponential backoff:

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

// Query with automatic retry
const user = await queryClient.query({
  key: ['users', userId],
  fn: () => http.get<User>(`/users/${userId}`),
  retry: 3, // Retry 3 times with exponential backoff (1s, 2s, 4s)
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});

// Mutation with retry
const createUser = queryClient.mutation(
  (data: { name: string }) => http.post<User>('/users', { body: data }),
  { retry: 2 }, // Retry POST operations 2 times
);
await createUser.mutate({ name: 'Alice' });

// Custom fixed retry delay
const data = await queryClient.query({
  key: ['status'],
  fn: () => http.get('/status'),
  retry: 5,
  retryDelay: 2000, // Fixed 2s delay between retries
});
```

### Polling

```ts
const http = createHttp({ baseUrl: 'https://api.example.com' });
const queryClient = createQuery();

function startPolling(interval: number, onData: (data: any) => void) {
  const pollId = setInterval(async () => {
    try {
      // Invalidate to force refetch
      queryClient.invalidate(['status']);
      const data = await queryClient.query({
        key: ['status'],
        fn: () => http.get('/status'),
      });
      onData(data);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, interval);

  return () => clearInterval(pollId);
}

// Usage
const stopPolling = startPolling('/status', 5000, (status) => {
  console.log('Status update:', status);
});

// Later: stopPolling();
```

### Batch Requests

```ts
import { createHttp } from '@vielzeug/fetchit';

const http = createHttp({ baseUrl: 'https://api.example.com' });

async function batchFetch<T>(ids: string[]): Promise<T[]> {
  const requests = ids.map((id) => http.get<T>(`/users/${id}`));
  return await Promise.all(requests);
}

// Usage
const users = await batchFetch<User>(['1', '2', '3']);
```
