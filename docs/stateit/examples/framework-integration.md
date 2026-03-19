---
title: 'Stateit Examples — Framework Integration'
description: 'React, Vue, and Svelte integration examples for Stateit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/stateit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/stateit` installed.

Stateit stays framework-agnostic, so the integration pattern is always the same: subscribe to signals or stores using the framework’s native lifecycle APIs.

### Store Bindings

::: code-group

```tsx [React]
// store-hooks.ts
import { useSyncExternalStore } from 'react';
import { watch } from '@vielzeug/stateit';
import type { Store } from '@vielzeug/stateit';

export function useStoreState<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(
    (notify) => {
      const sub = watch(store, notify);
      return () => sub.dispose();
    },
    () => store.value,
    () => store.value,
  );
}

export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): U {
  const sliceSignal = store.select(selector);
  return useSyncExternalStore(
    (notify) => {
      const sub = watch(sliceSignal, notify);
      return () => sub.dispose();
    },
    () => sliceSignal.value,
    () => sliceSignal.value,
  );
}
```

```ts [Vue 3]
// composables/useStore.ts
import { ref, onUnmounted, type Ref } from 'vue';
import { watch } from '@vielzeug/stateit';
import type { Store } from '@vielzeug/stateit';

export function useStoreState<T extends object>(store: Store<T>): Ref<T> {
  const state = ref(store.value) as Ref<T>;
  const sub = watch(store, (next) => {
    state.value = next;
  });
  onUnmounted(() => sub.dispose());
  return state;
}

export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): Ref<U> {
  const sliceSignal = store.select(selector);
  const selected = ref(sliceSignal.value) as Ref<U>;
  const sub = watch(sliceSignal, (next) => {
    selected.value = next;
  });
  onUnmounted(() => sub.dispose());
  return selected;
}
```

```ts [Svelte]
// lib/stateit-svelte.ts
import { watch } from '@vielzeug/stateit';
import type { Store, ReadonlySignal } from '@vielzeug/stateit';
import type { Readable } from 'svelte/store';

export function readable<T>(source: ReadonlySignal<T>): Readable<T> {
  return {
    subscribe(run) {
      run(source.value);
      const sub = watch(source, (next) => run(next));
      return () => sub.dispose();
    },
  };
}

export function readableSelector<T extends object, U>(source: Store<T>, selector: (state: T) => U): Readable<U> {
  return readable(source.select(selector));
}
```

:::

### Component Usage

::: code-group

```tsx [React]
import { useStoreSelector } from './store-hooks';

function Counter() {
  const count = useStoreSelector(counterStore, (s) => s.count);
  return <button onClick={() => counterStore.update((s) => ({ count: s.count + 1 }))}>{count}</button>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { useStoreSelector } from '@/composables/useStore';
import { counterStore } from '@/stores/counter.store';

const count = useStoreSelector(counterStore, (s) => s.count);
const increment = () => counterStore.update((s) => ({ count: s.count + 1 }));
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { readableSelector } from '$lib/stateit-svelte';
  import { counterStore } from '$lib/counter.store';

  const count = readableSelector(counterStore, (s) => s.count);
</script>

<button on:click={() => counterStore.update((s) => ({ count: s.count + 1 }))}>
  {$count}
</button>
```

:::

For larger end-to-end examples, keep using the dedicated pages for [Signals](./signals.md), [Stores](./stores.md), and the pattern recipes.

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: `nextValue` in Async Workflows](./pattern-nextvalue-in-async-workflows.md)
- [Pattern: Shared Module Store](./pattern-shared-module-store.md)
