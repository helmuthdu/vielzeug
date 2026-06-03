---
title: 'Wayfinder Examples — Vue 3 Integration'
description: 'Vue 3 integration example for @vielzeug/wayfinder.'
---

## Vue 3 Integration

### Problem

Vue's reactivity system needs both an initial value and change notifications from the router. `ref()` on a deeply nested immutable object adds unnecessary tracking overhead.

### Solution

Use `shallowRef(router.getSnapshot())` initialized at module scope and update via `router.subscribe()`. Expose a single `useRouter()` composable.

```ts
// router.ts
import { createRouter } from '@vielzeug/wayfinder';
import { readonly, shallowRef } from 'vue';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
    notFound: { component: NotFoundPage, path: '*' },
  },
});

const state = shallowRef(router.getSnapshot());
router.subscribe((next) => {
  state.value = next;
});

// Stable bound references, safe to return from the composable.
const isActive = router.isActive.bind(router);
const navigate = router.navigate.bind(router);
const url = router.url.bind(router);

export function useRouter() {
  return { isActive, navigate, state: readonly(state), url };
}
```

```vue
<!-- RouterView.vue -->
<script setup lang="ts">
import { computed } from 'vue';

import { useRouter } from './router';

const { state } = useRouter();
const component = computed(() => state.value.matches.at(-1)?.component);
</script>

<template>
  <component :is="component" v-if="component" />
</template>
```

```vue
<!-- RouterLink.vue -->
<script setup lang="ts">
import { computed } from 'vue';

import { useRouter } from './router';

const props = defineProps<{
  name: 'home' | 'settings' | 'notFound';
}>();

const { isActive, navigate, state, url } = useRouter();
const href = computed(() => url(props.name));
const active = computed(() => {
  void state.value;

  return isActive(props.name);
});
</script>

<template>
  <a :aria-current="active ? 'page' : undefined" :href="href" @click.prevent="() => navigate({ name: props.name })">
    <slot />
  </a>
</template>
```

This gives a Vue-Router-like DX (`useRouter()` composable, link + view) without an adapter package.

### Pitfalls

- Use `shallowRef` not `ref`. `RouteState` is a deep immutable object; deep tracking wastes memory and triggers false positives on object identity comparisons.
- `isActive()` reads `history.location` directly, not the reactive ref. Add `void state.value` in the `active` computed (shown above) to force recomputation on every navigation.

### Related

- [React Integration](./react-integration.md)
- [Svelte Integration](./svelte-integration.md)
