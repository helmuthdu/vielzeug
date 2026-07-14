---
title: Dnd — Usage Guide
description: Drop zones, sortable lists, explicit connected scopes, keyboard sorting, and cleanup patterns with Dnd.
---

[[toc]]

## Basic Usage

`createDropZone` attaches drag-and-drop behavior to any DOM element and keeps hover state stable with a counter.

```ts
import { createDropZone } from '@vielzeug/dnd';

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

The `accept` list is read at drop-time, so mutating the array dynamically adjusts what is accepted for the next drop.

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
console.log(zone.validating);
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

### Disabled state

```ts
const options = { disabled: false, element: dropEl, onDrop: handleFiles };
const zone = createDropZone(options);

// options.disabled is read live on each event — mutate to toggle:
options.disabled = isReadOnly;
```

### File limit

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*'],
  maxFiles: 5,
  onDrop: (files) => {
    // 1-5 accepted files
  },
  onDropRejected: (files) => {
    showToast(`Only 5 files at a time. ${files.length} were ignored.`);
  },
});
```

### Cleanup

```ts
zone.dispose();
// or:
using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
```

### Async validation

Gate drops behind an async check with `onValidate`. The zone sets `validating: true` while the promise is pending; on resolution, accepted files go to `onDrop` and rejected files go to `onDropRejected`.

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*'],
  onValidate: async (files) => {
    const ok = await checkServerQuota(files);
    return ok; // false → all files forwarded to onDropRejected
  },
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => showError('Quota exceeded'),
});

// show a spinner while checking
console.log(zone.validating); // true during pending check
```

A synchronous boolean return skips the microtask queue entirely:

```ts
const zone = createDropZone({
  element: dropEl,
  onValidate: (files) => files.every((f) => f.size < 5_000_000), // sync
  onDrop: handleFiles,
});
```

### Clipboard paste

Set `paste: true` to accept files pasted from the clipboard. The same `accept`, `maxFiles`, and `onValidate` pipeline applies.

```ts
const zone = createDropZone({
  element: dropEl,
  paste: true,
  accept: ['image/*'],
  onPaste: (files) => {
    uploadFiles(files);
  },
  onDropRejected: (files) => {
    showError(`${files.length} file(s) not accepted`);
  },
});
```

When `onPaste` is omitted, accepted pasted files fall through to `onDrop`.

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
  getKey: (el) => el.dataset.sortId!,
  axis: 'vertical',
  onReorder: ({ ids }) => {
    saveTaskOrder(ids);
  },
});
```

Dnd automatically sets:

- `draggable="true"` on sortable nodes (or handles)
- `role="listitem"` on each item
- `role="list"` on the container
- `tabindex="0"` on each item for keyboard reordering

### Drag handles

```ts
createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  handle: '.drag-handle',
  onReorder: ({ ids }) => saveOrder(ids),
});
```

### Keyboard reordering

Focus an item and use arrow keys to move it. `Home` and `End` move to the boundary positions.

When an item is already at the first or last position, the boundary key press is not consumed — the browser handles it normally (for example, scrolling the page). Only keys that actually move an item call `preventDefault`.

### Connected lists

Create a shared scope when items should move between containers:

```ts
const boardScope = createSortableScope();

createSortable({
  element: todoEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => saveTodoOrder(ids),
  scope: boardScope,
});
createSortable({
  element: doneEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => saveDoneOrder(ids),
  scope: boardScope,
});
```

### Auto-scroll and drag preview

```ts
createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  autoScroll: { edgeThreshold: 40, speed: 24, viewport: true },
  dragImage: (id, item) => item,
  dragImageOffset: [8, 8],
});
```

Viewport scrolling is opt-in. Container scrolling stays enabled by default.

### Lifecycle hooks

```ts
createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: (id) => {
    listEl.classList.remove('sorting');
  },
  onReorder: ({ ids }) => saveOrder(ids),
});
```

### Custom identity function

```ts
createSortable({
  element: listEl,
  getKey: (el) => el.getAttribute('data-id')!,
  onReorder: ({ ids }) => saveOrder(ids),
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
import { createSortable, type SortableOptions } from '@vielzeug/dnd';

const options: SortableOptions = {
  disabled: false,
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => saveOrder(ids),
};
const sortable = createSortable(options);

// options.disabled is read live on each event — mutate to toggle:
options.disabled = isLocked;
```

### Placeholder styling

```css
.dnd-placeholder {
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
import { applyReorder, createSortable } from '@vielzeug/dnd';

let items = [
  { id: 'task-1', title: 'Design' },
  { id: 'task-2', title: 'Develop' },
  { id: 'task-3', title: 'Review' },
];

createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => {
    items = applyReorder(items, ids, (item) => item.id);
  },
});
```

### Cleanup

```ts
sortable.dispose();
// or:
using sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => saveOrder(ids),
});
```

### FLIP animation hook

`onBeforeReorder` fires just before the DOM reorder commits, for both drag and keyboard moves. At the time of the call items are still in their pre-commit positions, making it the right place to record element bounds for FLIP animations.

```ts
const sortable = createSortable({
  element: listEl,
  onBeforeReorder: (from, to) => {
    // snapshot bounds before the DOM moves
    const snapshots = new Map(getItems().map((el) => [el.dataset.sortId!, el.getBoundingClientRect()]));

    requestAnimationFrame(() => {
      // animate from snapshot to new position
      for (const [id, before] of snapshots) {
        const el = listEl.querySelector(`[data-sort-id="${id}"]`) as HTMLElement;
        const after = el.getBoundingClientRect();
        const dy = before.top - after.top;
        if (dy === 0) continue;
        el.style.transform = `translateY(${dy}px)`;
        el.style.transition = 'none';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 200ms ease';
          el.style.transform = '';
        });
      }
    });
  },
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => saveOrder(ids),
});
```

### Optimistic updates and revert

Call `sortable.revert()` to roll back the most recent reorder. Register a revert function via `setRevert` inside `onReorder`.

```ts
const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids, setRevert }) => {
    const prev = currentOrder;
    setOrder(ids); // optimistic update
    setRevert(() => setOrder(prev)); // registered for sortable.revert()
  },
});

// On server error:
try {
  await api.saveOrder(currentOrder);
} catch {
  sortable.revert();
}
```

## Touch Support

HTML5 drag-and-drop has no native touch story — touch devices never fire `dragstart`/`dragover`/`drop`. `createTouchDragShim` bridges `touchstart`/`touchmove`/`touchend`/`touchcancel` into that same synthetic `DragEvent` sequence at the `document` level, so `createSortable`/`createDropZone` work on touch with no per-instance wiring.

```ts
import { createTouchDragShim } from '@vielzeug/dnd';

// Call once at app startup — one instance covers the whole page.
using touchDrag = createTouchDragShim();
```

### Custom draggable selector

Defaults to `[draggable="true"]` — the attribute `createSortable`/`createDropZone` already set on managed elements. Override it if you're bridging touch to elements you manage draggability on yourself.

```ts
createTouchDragShim({ draggableSelector: '.my-drag-handle' });
```

### Disabled state

```ts
const options = { disabled: false };
const touchDrag = createTouchDragShim(options);

// options.disabled is read live on each touch event — mutate to toggle:
options.disabled = true;
```

### Cleanup

```ts
touchDrag.dispose();
// or:
using touchDrag = createTouchDragShim();
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createSortable, applyReorder } from '@vielzeug/dnd';

function SortableList({ initialItems }: { initialItems: { id: string; text: string }[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = useRef(initialItems);

  useEffect(() => {
    const sortable = createSortable({
      element: listRef.current!,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ ids }) => {
        items.current = applyReorder(items.current, ids, (i) => i.id);
      },
    });
    return () => sortable.dispose();
  }, []);

  return (
    <ul ref={listRef}>
      {initialItems.map((item) => (
        <li key={item.id} data-sort-id={item.id}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
```

```ts [Vue 3]
import { ref, onMounted, onUnmounted } from 'vue';
import { createSortable, applyReorder, type Sortable } from '@vielzeug/dnd';

function useSortable(items: { id: string; text: string }[]) {
  const listRef = ref<HTMLElement | null>(null);
  const orderedItems = ref(items);
  let sortable: Sortable | null = null;

  onMounted(() => {
    sortable = createSortable({
      element: listRef.value!,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ ids }) => {
        orderedItems.value = applyReorder(orderedItems.value, ids, (i) => i.id);
      },
    });
  });

  onUnmounted(() => sortable?.dispose());
  return { listRef, orderedItems };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createSortable, applyReorder } from '@vielzeug/dnd';

  export let initialItems: { id: string; text: string }[] = [];
  let items = initialItems;
  let listEl: HTMLUListElement;

  onMount(() => {
    const sortable = createSortable({
      element: listEl,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ ids }) => { items = applyReorder(items, ids, (i) => i.id); },
    });
    return () => sortable.dispose();
  });
</script>

<ul bind:this={listEl}>
  {#each items as item (item.id)}
    <li data-sort-id={item.id}>{item.text}</li>
  {/each}
</ul>
```

:::

## Working with Other Vielzeug Libraries

### With Ore

Use Dnd in custom web components by attaching behavior in component lifecycle hooks.

```ts
import { createSortable } from '@vielzeug/dnd';
import { define, getHost, html, onMounted } from '@vielzeug/ore';

define('task-list', {
  setup(_props) {
    const el = getHost();

    onMounted(() => {
      const sortable = createSortable({
        element: el,
        getKey: (el) => el.dataset.sortId!,
        onReorder: ({ ids }) => save(ids),
      });
      return () => sortable.dispose();
    });

    return html`<slot></slot>`;
  },
});
```

## Best Practices

- Attach `createDropZone` and `createSortable` after the container element is in the DOM — use `onMounted` in component frameworks.
- Call `.dispose()` in the cleanup phase of your framework (useEffect return, onUnmounted, onDestroy) to prevent memory leaks.
- Use `data-sort-id` attributes that match your data's identity field — do not use DOM index as an identifier.
- Prefer `applyReorder()` over manual array splicing to keep your data array in sync with DOM order.
- Use `createSortableScope()` only when items should genuinely move between containers.
- Use drag handles (`.handle` selector) when the full item surface area conflicts with other interactions such as text selection.
- Test keyboard reordering explicitly — Dnd sets `tabindex` on items and supports arrow keys by default.
- Call `createTouchDragShim()` once at app startup if you support touch devices — it's a single `document`-level bridge, not something to attach per `createSortable`/`createDropZone` instance.
