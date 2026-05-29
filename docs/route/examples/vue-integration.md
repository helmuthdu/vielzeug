---
title: 'Route Examples — Vue 3 Integration'
description: Minimal Composition API setup for route with RouterView/RouterLink patterns.
---

## Vue 3 Integration

Export a single `useRouter()` composable from `router.ts`. It returns reactive route state and bound router actions, so components import one symbol and call one composable.

```ts
// router.ts
import { createRouter } from '@vielzeug/route';
import { readonly, shallowRef } from 'vue';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
    notFound: { component: NotFoundPage, path: '*' },
  },
});

const state = shallowRef(router.state);
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
  <a
    :aria-current="active ? 'page' : undefined"
    :href="href"
    @click.prevent="() => navigate({ name: props.name })"
  >
    <slot />
  </a>
</template>
```

This gives a Vue-Router-like DX (`useRouter()` composable, link + view) without an adapter package.
