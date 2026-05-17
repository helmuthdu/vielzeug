---
title: Dragit — Usage Guide
description: Drop zones, sortable lists, explicit connected scopes, keyboard sorting, and cleanup patterns with Dragit.
---

[[toc]]

::: tip New to Dragit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

## Drop Zone

`createDropZone` attaches drag-and-drop behavior to any DOM element and keeps hover state stable with a counter.

### Basic usage

```ts
const zone = createDropZone({
  element: document.getElementById('dropzone')!,
  onDrop: (files) => {
    uploadFiles(files);
  },
});
```

### Accept filtering

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf', 'application/json'],
  onDrop: (files) => {
    // accepted files only
  },
  onDropRejected: (files) => {
    showToast(`${files.length} file(s) not accepted`);
  },
});
```

For reactive apps, `accept` can be a getter:

```ts
const zone = createDropZone({
  element: dropEl,
  accept: () => (isMediaMode.value ? ['image/*', 'video/*'] : ['application/pdf']),
});
```

### Hover state

```ts
const zone = createDropZone({
  element: dropEl,
  onHoverChange: (hovered) => {
    dropEl.classList.toggle('drag-over', hovered);
  },
});
```

Read zone state imperatively:

```ts
console.log(zone.hovered);
console.log(zone.files);
console.log(zone.rejected);
```

### Drop effect

```ts
createDropZone({
  element: dropEl,
  dropEffect: 'move',
  onDrop: (files) => {
    // ...
  },
});
```

### Sortable disabled state

```ts
createDropZone({
  element: dropEl,
  disabled: () => isReadOnly.value,
  onDrop: handleFiles,
});
```

### Sortable cleanup

```ts
zone.destroy();
// or:
using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
```

---

## Sortable

`createSortable` makes direct children of a container reorderable via drag.

### Setup

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
</ul>
```

```ts
const sortable = createSortable({
  element: document.getElementById('task-list')!,
  axis: 'vertical',
  onReorder: (ids) => {
    saveTaskOrder(ids);
  },
});
```

Dragit automatically sets:

- `draggable="true"` on sortable nodes (or handles)
- `role="listitem"` on each item
- `role="list"` on the container
- `tabindex="0"` on each item for keyboard reordering

### Drag handles

```ts
createSortable({
  element: listEl,
  handle: '.drag-handle',
  onReorder: saveOrder,
});
```

### Keyboard reordering

Focus an item and use arrow keys to move it. `Home` and `End` move to boundaries.

### Connected lists

Create a shared scope when items should move between containers:

```ts
const boardScope = createSortableScope();

createSortable({ element: todoEl, onReorder: saveTodoOrder, scope: boardScope });
createSortable({ element: doneEl, onReorder: saveDoneOrder, scope: boardScope });
```

### Auto-scroll and drag preview

```ts
createSortable({
  element: listEl,
  autoScroll: { edgeThreshold: 40, speed: 24, viewport: true },
  dragImage: (id, item) => item,
});
```

Viewport scrolling is opt-in. Container scrolling stays enabled by default.

### Lifecycle hooks

```ts
createSortable({
  element: listEl,
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: (id) => {
    listEl.classList.remove('sorting');
  },
  onReorder: saveOrder,
});
```

### Custom identity attribute

```ts
createSortable({
  element: listEl,
  itemAttribute: 'data-id',
  onReorder: saveOrder,
});
```

### Dynamic lists

Call `sortable.sync()` after adding, removing, or replacing sortable items.

```ts
const item = document.createElement('li');
item.dataset.sortId = 'task-4';
item.textContent = 'Deploy';
listEl.appendChild(item);
sortable.sync();
```

### Disabled state

```ts
createSortable({
  element: listEl,
  disabled: () => isLocked,
  onReorder: saveOrder,
});
```

### Placeholder styling

```css
.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}

[data-dragging] {
  opacity: 0.35;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Mapping DOM order back to data

```ts
import { applyReorder, createSortable } from '@vielzeug/dragit';

let items = [
  { id: 'task-1', title: 'Design' },
  { id: 'task-2', title: 'Develop' },
  { id: 'task-3', title: 'Review' },
];

createSortable({
  element: listEl,
  onReorder: (orderedIds) => {
    items = applyReorder(items, orderedIds, (item) => item.id);
  },
});
```

### Cleanup

```ts
sortable.destroy();
// or:
using sortable = createSortable({ element: listEl, onReorder: saveOrder });
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createSortable, applyReorder } from '@vielzeug/dragit';

function SortableList({ initialItems }: { initialItems: { id: string; text: string }[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = useRef(initialItems);

  useEffect(() => {
    const sortable = createSortable({
      element: listRef.current!,
      onReorder: (orderedIds) => {
        items.current = applyReorder(items.current, orderedIds, (i) => i.id);
      },
    });
    return () => sortable.destroy();
  }, []);

  return (
    <ul ref={listRef}>
      {initialItems.map((item) => (
        <li key={item.id} data-sort-id={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
```

```ts [Vue 3]
import { ref, onMounted, onUnmounted } from 'vue';
import { createSortable, applyReorder, type Sortable } from '@vielzeug/dragit';

function useSortable(items: { id: string; text: string }[]) {
  const listRef = ref<HTMLElement | null>(null);
  const orderedItems = ref(items);
  let sortable: Sortable | null = null;

  onMounted(() => {
    sortable = createSortable({
      element: listRef.value!,
      onReorder: (ids) => {
        orderedItems.value = applyReorder(orderedItems.value, ids, (i) => i.id);
      },
    });
  });

  onUnmounted(() => sortable?.destroy());
  return { listRef, orderedItems };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createSortable, applyReorder } from '@vielzeug/dragit';

  export let initialItems: { id: string; text: string }[] = [];
  let items = initialItems;
  let listEl: HTMLUListElement;

  onMount(() => {
    const sortable = createSortable({
      element: listEl,
      onReorder: (ids) => { items = applyReorder(items, ids, (i) => i.id); },
    });
    return () => sortable.destroy();
  });
</script>

<ul bind:this={listEl}>
  {#each items as item (item.id)}
    <li data-sort-id={item.id}>{item.text}</li>
  {/each}
</ul>
```

:::

### Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Working with Other Vielzeug Libraries

### With Craftit

Use Dragit in custom web components by attaching behavior in component lifecycle hooks.

```ts
import { createSortable } from '@vielzeug/dragit';
import { define, onMounted, html } from '@vielzeug/craftit';

define('task-list', {
  setup(_props, { host }) {
    onMounted(() => {
      const sortable = createSortable({ element: host.el, onReorder: (ids) => save(ids) });
      return () => sortable.destroy();
    });
    return () => html`<slot></slot>`;
  },
});
```

## Best Practices

- Attach `createDropZone` and `createSortable` after the container element is in the DOM — use `onMounted` in component frameworks.
- Call `.destroy()` in the cleanup phase of your framework (useEffect return, onUnmounted, onDestroy) to prevent memory leaks.
- Use `data-sort-id` attributes that match your data's identity field — do not use DOM index as an identifier.
- Prefer `applyReorder()` over manual array splicing to keep your data array in sync with DOM order.
- Use `createSortableScope()` only when items should genuinely move between containers.
- Use drag handles (`.handle` selector) when the full item surface area conflicts with other interactions such as text selection.
- Test keyboard reordering explicitly — Dragit sets `tabindex` on items and supports arrow keys by default.
