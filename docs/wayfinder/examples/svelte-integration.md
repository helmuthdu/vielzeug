---
title: 'Wayfinder Examples — Svelte Integration'
description: 'Svelte integration example for @vielzeug/wayfinder.'
---

## Svelte Integration

### Problem

Svelte's `$store` auto-subscription calls `store.subscribe(run)` and expects `run` to be invoked immediately with the current value. `router.subscribe()` only fires on _subsequent_ state changes, so direct use yields `undefined` as the initial value.

### Solution

Wrap the router in `readable(router.getSnapshot(), set => router.subscribe(set))` from `svelte/store`. This injects the current state as the initial value while router updates drive subsequent changes.

```ts
// router.ts
import { createRouter } from '@vielzeug/wayfinder';
import { readable } from 'svelte/store';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
    notFound: { component: NotFoundPage, path: '*' },
  },
});

// Wraps the router in a Svelte-compatible readable store.
// `readable` calls set(initialValue) immediately, then router.subscribe drives updates.
export const routerState = readable(router.getSnapshot(), (set) => router.subscribe(set));

// Expose actions directly (not reactive, just bound references).
export const navigate = router.navigate.bind(router);
export const url = router.url.bind(router);
export const isActive = router.isActive.bind(router);
```

```svelte
<!-- RouterView.svelte -->
<script lang="ts">
  import { routerState } from './router';

  $: component = $routerState.matches.at(-1)?.component;
</script>

{#if component}
  <svelte:component this={component} />
{/if}
```

```svelte
<!-- RouterLink.svelte -->
<script lang="ts">
  import { isActive, navigate, routerState, url } from './router';

  export let name: 'home' | 'settings' | 'notFound';

  $: void $routerState;
  $: href = url(name);
  $: active = isActive(name);

  function go(event: MouseEvent) {
    event.preventDefault();
    void navigate({ name });
  }
</script>

<a aria-current={active ? 'page' : undefined} href={href} on:click={go}>
  <slot />
</a>
```

Using `readable` from `svelte/store` ensures the store gets its initial value synchronously and updates reactively on every navigation.

### Pitfalls

- Passing `router` directly as a Svelte store yields `undefined` for `$routerState` until the first navigation. Always use the `readable` wrapper.
- The `readable` teardown is called when all subscribers unsubscribe. Do not call `router.dispose()` inside it unless you want to permanently shut down routing (e.g., end-to-end test cleanup).

### Related

- [React Integration](./react-integration.md)
- [Vue Integration](./vue-integration.md)
