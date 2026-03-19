---
title: 'Routeit Examples — Framework Integration'
description: 'Framework Integration examples for routeit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

### Basic Integration

Integrate Routeit with your framework by subscribing to route state.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/routeit';
import { useState, useEffect } from 'react';

const router = createRouter();

router
  .on('/', () => {})
  .on('/about', () => {})
  .on('/users/:id', () => {})
  .start();

function App() {
  const [state, setState] = useState(() => router.state);

  useEffect(() => router.subscribe(setState), []);

  const { pathname, params } = state;

  return (
    <div>
      <nav>
        <button onClick={() => router.navigate('/')}>Home</button>
        <button onClick={() => router.navigate('/about')}>About</button>
        <button onClick={() => router.navigate('/users/123')}>User</button>
      </nav>
      <main>
        {pathname === '/' && <h1>Home</h1>}
        {pathname === '/about' && <h1>About</h1>}
        {pathname.startsWith('/users') && <h1>User {params.id}</h1>}
      </main>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

router
  .on('/', () => {})
  .on('/about', () => {})
  .on('/users/:id', () => {})
  .start();

const state = ref(router.state);
let unsubscribe: () => void;

onMounted(() => {
  unsubscribe = router.subscribe((s) => {
    state.value = s;
  });
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div>
    <nav>
      <button @click="router.navigate('/')">Home</button>
      <button @click="router.navigate('/about')">About</button>
      <button @click="router.navigate('/users/123')">User</button>
    </nav>
    <main>
      <h1 v-if="state.pathname === '/'">Home</h1>
      <h1 v-else-if="state.pathname === '/about'">About</h1>
      <h1 v-else>User {{ state.params.id }}</h1>
    </main>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createRouter } from '@vielzeug/routeit';
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  const router = createRouter();
  const state = writable(router.state);

  router
    .on('/', () => {})
    .on('/about', () => {})
    .on('/users/:id', () => {})
    .start();

  const unsubscribe = router.subscribe((s) => state.set(s));
  onDestroy(unsubscribe);
</script>

<div>
  <nav>
    <button on:click={() => router.navigate('/')}>Home</button>
    <button on:click={() => router.navigate('/about')}>About</button>
    <button on:click={() => router.navigate('/users/123')}>User</button>
  </nav>
  <main>
    {#if $state.pathname === '/'}
      <h1>Home</h1>
    {:else if $state.pathname === '/about'}
      <h1>About</h1>
    {:else}
      <h1>User {$state.params.id}</h1>
    {/if}
  </main>
</div>
```

:::

### React Hook

A reusable hook exposing router state reactively:

```tsx
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { useState, useEffect, createContext, useContext } from 'react';

const RouterContext = createContext<ReturnType<typeof createRouter> | null>(null);

export function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useRouter must be used inside <RouterProvider>');
  const [state, setState] = useState<RouteState>(() => router.state);
  useEffect(() => router.subscribe(setState), [router]);
  return { state, navigate: router.navigate.bind(router), isActive: router.isActive.bind(router) };
}

// App setup
const router = createRouter();
router
  .on('/', () => {})
  .on('/about', () => {})
  .start();

function RouterProvider({ children }: { children: React.ReactNode }) {
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { state, navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      style={{ fontWeight: state.pathname === to ? 'bold' : 'normal' }}>
      {children}
    </a>
  );
}
```

### Vue Composable

```ts
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

export function useRouter() {
  const state = ref<RouteState>(router.state);
  let unsubscribe: () => void;

  onMounted(() => {
    unsubscribe = router.subscribe((s) => {
      state.value = s;
    });
  });
  onUnmounted(() => unsubscribe?.());

  return {
    state,
    navigate: router.navigate.bind(router),
    isActive: router.isActive.bind(router),
    url: router.url.bind(router),
  };
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
