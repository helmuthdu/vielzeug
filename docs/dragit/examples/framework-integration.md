---
title: 'Dragit Examples — Framework Integration'
description: 'React, Vue, and Svelte integration examples for Dragit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

Use Dragit from framework components by attaching the behavior when the DOM element mounts and cleaning it up when the component unmounts.

### File Drop Zone

::: code-group

```tsx [React]
import { useEffect, useRef, useState } from 'react';
import { createDropZone } from '@vielzeug/dragit';

interface FileDropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];
  disabled?: boolean;
}

export function FileDropZone({ onFiles, accept = [], disabled = false }: FileDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const zone = createDropZone({
      element: ref.current,
      accept,
      disabled,
      onDrop: onFiles,
      onHoverChange: setHovered,
    });

    return () => zone.destroy();
  }, [accept, disabled, onFiles]);

  return (
    <div ref={ref} className={`dropzone ${hovered ? 'drag-over' : ''}`} role="button" tabIndex={0}>
      Drop files here
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onUnmounted, ref, watchEffect } from 'vue';
import { createDropZone, type DropZoneOptions } from '@vielzeug/dragit';

const emit = defineEmits<{ files: [File[]] }>();
const el = ref<HTMLElement | null>(null);
const hovered = ref(false);
const zone = ref<ReturnType<typeof createDropZone> | null>(null);

const options: Omit<DropZoneOptions, 'element'> = {
  accept: ['image/*'],
  onDrop: (files) => emit('files', files),
};

watchEffect(() => {
  zone.value?.destroy();
  if (!el.value) return;

  zone.value = createDropZone({
    ...options,
    element: el.value,
    onHoverChange: (value) => {
      hovered.value = value;
      options.onHoverChange?.(value);
    },
  });
});

onUnmounted(() => zone.value?.destroy());
</script>

<template>
  <div ref="el" :class="['dropzone', { 'drag-over': hovered }]">Drop images here</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createDropZone } from '@vielzeug/dragit';

  export let accept: string[] = [];
  export let onFiles: (files: File[]) => void;

  let hovered = false;
  let zone: ReturnType<typeof createDropZone> | null = null;

  function init(node: HTMLDivElement) {
    zone = createDropZone({
      element: node,
      accept,
      onDrop: onFiles,
      onHoverChange: (value) => {
        hovered = value;
      },
    });

    return {
      destroy: () => zone?.destroy(),
    };
  }

  onDestroy(() => zone?.destroy());
</script>

<div use:init class:drag-over={hovered} class="dropzone">
  <slot>Drop files here</slot>
</div>
```

:::

### Sortable List

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createSortable } from '@vielzeug/dragit';

interface Item {
  id: string;
  label: string;
}

interface SortableListProps {
  items: Item[];
  onReorder: (ids: string[]) => void;
}

export function SortableList({ items, onReorder }: SortableListProps) {
  const ref = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<ReturnType<typeof createSortable> | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    sortableRef.current = createSortable({
      element: ref.current,
      onReorder,
    });

    return () => sortableRef.current?.destroy();
  }, [onReorder]);

  return (
    <ul ref={ref}>
      {items.map((item) => (
        <li key={item.id} data-sort-id={item.id}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { createSortable, type SortableOptions } from '@vielzeug/dragit';

const props = defineProps<{ items: { id: string; label: string }[] }>();
const emit = defineEmits<{ reorder: [string[]] }>();
const container = ref<HTMLElement | null>(null);
let sortable: ReturnType<typeof createSortable> | null = null;

watch(
  container,
  (el) => {
    sortable?.destroy();
    if (!el) return;

    sortable = createSortable({
      ...({ onReorder: (ids: string[]) => emit('reorder', ids) } satisfies Omit<SortableOptions, 'element'>),
      element: el,
    });
  },
  { immediate: true },
);

watch(
  () => props.items,
  () => {}, // MutationObserver keeps draggable/role in sync automatically
  { deep: true },
);

onUnmounted(() => sortable?.destroy());
</script>

<template>
  <ul ref="container">
    <li v-for="item in items" :key="item.id" :data-sort-id="item.id">
      {{ item.label }}
    </li>
  </ul>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { afterUpdate, onDestroy } from 'svelte';
  import { createSortable } from '@vielzeug/dragit';

  export let items: { id: string; label: string }[] = [];
  export let onReorder: (ids: string[]) => void;

  let container: HTMLUListElement;
  let sortable: ReturnType<typeof createSortable> | null = null;

  $: if (container && !sortable) {
    sortable = createSortable({ element: container, onReorder });
  }

  onDestroy(() => sortable?.destroy());
</script>

<ul bind:this={container}>
  {#each items as item (item.id)}
    <li data-sort-id={item.id}>{item.label}</li>
  {/each}
</ul>
```

:::

For a Web Components example, see [Web Component with craftit](./web-component-with-craftit.md).

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Sortable list](./sortable-list.md)
