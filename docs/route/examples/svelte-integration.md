---
title: 'Route Examples — Svelte Integration'
description: Use route as a native Svelte readable store with no adapter code.
---

## Svelte Integration

`route` already matches Svelte's readable-store contract because `router.subscribe()` returns an unsubscribe function and pushes state updates.

That means you can use `$router` directly with no extra state helper.

```ts
// router.ts
import { createRouter } from '@vielzeug/route';

export const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
    notFound: { component: NotFoundPage, path: '*' },
  },
});
```

```svelte
<!-- RouterView.svelte -->
<script lang="ts">
  import { router } from './router';

  $: component = $router.matches.at(-1)?.component;
</script>

{#if component}
  <svelte:component this={component} />
{/if}
```

```svelte
<!-- RouterLink.svelte -->
<script lang="ts">
  import { router } from './router';

  export let name: 'home' | 'settings' | 'notFound';

  $: void $router;
  $: href = router.url(name);
  $: active = router.isActive(name);

  function go(event: MouseEvent) {
    event.preventDefault();
    void router.navigate({ name });
  }
</script>

<a aria-current={active ? 'page' : undefined} href={href} on:click={go}>
  <slot />
</a>
```

For Svelte apps, this is already router-like out of the box: links, active state, and route-driven component rendering without additional glue.
