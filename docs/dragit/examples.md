---
title: Dragit — Examples
description: Copy-paste ready drag-and-drop patterns for file upload zones, sortable lists, React, Vue, Svelte, and web components.
---

# Dragit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## File upload drop zone

A minimal file drop zone with hover feedback and type filtering:

```html
<div id="dropzone" class="dropzone" tabindex="0" role="button" aria-label="Drop files here">
  <p>Drop files here, or click to browse</p>
</div>
```

```css
.dropzone {
  border: 2px dashed var(--color-contrast-300);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition:
    background 150ms,
    border-color 150ms;
}

.dropzone.drag-over {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}
```

```ts
import { createDropZone } from '@vielzeug/dragit';

const el = document.getElementById('dropzone')!;

using zone = createDropZone({
  element: el,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    for (const file of files) {
      upload(file);
    }
  },
  onDropRejected: (files) => {
    showToast(`${files.length} file(s) not accepted. Only images and PDFs are allowed.`);
  },
  onHoverChange: (hovered) => {
    el.classList.toggle('drag-over', hovered);
  },
});
```

## Sortable list

A basic reorderable list with a visible drag handle and placeholder styling:

```html
<ul id="list">
  <li data-sort-id="a"><span class="handle">⠿</span> Item A</li>
  <li data-sort-id="b"><span class="handle">⠿</span> Item B</li>
  <li data-sort-id="c"><span class="handle">⠿</span> Item C</li>
</ul>
```

```css
.handle {
  cursor: grab;
  user-select: none;
  margin-right: 0.5rem;
  color: var(--color-contrast-400);
}

[data-dragging] {
  opacity: 0.3;
}

.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}
```

```ts
import { createSortable } from '@vielzeug/dragit';

using sortable = createSortable({
  container: document.getElementById('list')!,
  handle: '.handle',
  onReorder: (ids) => {
    console.log('New order:', ids); // ['b', 'a', 'c']
    saveOrder(ids);
  },
});
```

## React — file drop zone

Use a ref and `useEffect` to attach the zone to a DOM element:

```tsx
import { useEffect, useRef } from 'react';
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
      disabled: () => disabled,
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

## React — sortable list

```tsx
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
      container: ref.current,
      onReorder,
    });

    return () => sortableRef.current?.destroy();
  }, [onReorder]);

  // Refresh after items change so newly rendered children get draggable
  useEffect(() => {
    sortableRef.current?.refresh();
  }, [items]);

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

## Vue 3 — file drop zone composable

```ts
// src/composables/useDropZone.ts
import { onUnmounted, ref, type Ref } from 'vue';
import { createDropZone, type DropZoneOptions } from '@vielzeug/dragit';

export function useDropZone(element: Ref<HTMLElement | null>, options: Omit<DropZoneOptions, 'element'>) {
  const hovered = ref(false);

  const zone = ref<ReturnType<typeof createDropZone> | null>(null);

  watchEffect(() => {
    zone.value?.destroy();
    if (!element.value) return;

    zone.value = createDropZone({
      ...options,
      element: element.value,
      onHoverChange: (h) => {
        hovered.value = h;
        options.onHoverChange?.(h);
      },
    });
  });

  onUnmounted(() => zone.value?.destroy());

  return { hovered };
}
```

```vue
<!-- DropZone.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useDropZone } from './composables/useDropZone';

const emit = defineEmits<{ files: [File[]] }>();
const el = ref<HTMLElement | null>(null);

const { hovered } = useDropZone(el, {
  accept: ['image/*'],
  onDrop: (files) => emit('files', files),
});
</script>

<template>
  <div ref="el" :class="['dropzone', { 'drag-over': hovered }]">Drop images here</div>
</template>
```

## Vue 3 — sortable list composable

```ts
// src/composables/useSortable.ts
import { onUnmounted, watch, type Ref } from 'vue';
import { createSortable, type SortableOptions } from '@vielzeug/dragit';

export function useSortable(container: Ref<HTMLElement | null>, options: Omit<SortableOptions, 'container'>) {
  let sortable: ReturnType<typeof createSortable> | null = null;

  watch(
    container,
    (el) => {
      sortable?.destroy();
      if (!el) return;
      sortable = createSortable({ ...options, container: el });
    },
    { immediate: true },
  );

  onUnmounted(() => sortable?.destroy());

  return {
    refresh: () => sortable?.refresh(),
  };
}
```

## Svelte — file drop zone

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createDropZone } from '@vielzeug/dragit';

  export let accept: string[] = [];
  export let onFiles: (files: File[]) => void;

  let el: HTMLDivElement;
  let hovered = false;
  let zone: ReturnType<typeof createDropZone> | null = null;

  function init(node: HTMLDivElement) {
    zone = createDropZone({
      element: node,
      accept,
      onDrop: onFiles,
      onHoverChange: (h) => { hovered = h; },
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

## Web Component with craftit

```ts
import { define, html, onCleanup, onMount, ref, signal } from '@vielzeug/craftit';
import { createDropZone } from '@vielzeug/dragit';

define('my-dropzone', (props) => {
  const isDragging = signal(false);
  const dropzoneRef = ref<HTMLElement>();

  onMount(() => {
    const el = dropzoneRef.value!;

    const zone = createDropZone({
      element: el,
      accept: ['image/*'],
      onDrop: (files) => {
        /* handle upload */
      },
      onHoverChange: (hovered) => {
        isDragging.value = hovered;
      },
    });

    onCleanup(() => zone.destroy());
  });

  return {
    template: html`
      <div ref=${dropzoneRef} class="dropzone" :class=${{ 'drag-over': () => isDragging.value }}>
        <slot>Drop images here</slot>
      </div>
    `,
  };
});
```

## Combined: sortable with inline editing

A list where items can be reordered by drag and inline-edited:

```ts
import { createSortable } from '@vielzeug/dragit';

let items = [
  { id: '1', label: 'Design' },
  { id: '2', label: 'Develop' },
  { id: '3', label: 'Deploy' },
];

function render() {
  listEl.innerHTML = items
    .map(
      (item) => `
        <li data-sort-id="${item.id}">
          <span class="handle">⠿</span>
          <input value="${item.label}" data-item-id="${item.id}" />
        </li>
      `,
    )
    .join('');

  sortable.refresh(); // sync draggable after re-render
}

const sortable = createSortable({
  container: listEl,
  handle: '.handle',
  onReorder: (ids) => {
    items = ids.map((id) => items.find((i) => i.id === id)!);
    saveItems(items);
  },
});

render();
```

## Using `using` for scoped cleanup

Both primitives implement `[Symbol.dispose]`, so they work with the `using` keyword in any block scope, including `try` blocks and async functions:

```ts
import { createDropZone, createSortable } from '@vielzeug/dragit';

async function setupPage() {
  using zone = createDropZone({
    element: document.getElementById('dropzone')!,
    onDrop: handleFiles,
  });

  using sortable = createSortable({
    container: document.getElementById('list')!,
    onReorder: saveOrder,
  });

  await pageReady();

  // Both zone and sortable are still active here
  // They are destroyed automatically when setupPage() returns or throws
}
```
