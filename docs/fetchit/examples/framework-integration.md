---
title: 'Fetchit Examples — Framework Integration'
description: 'Framework Integration examples for fetchit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
