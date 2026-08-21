---
title: Dnd — Usage Guide
description: Drop zones, sortable lists, explicit connected scopes, keyboard sorting, and cleanup patterns with Dnd.
---

[[toc]]

## Basic Usage

`createDropZone` attaches drag-and-drop behavior to any DOM element and keeps hover state stable with a counter.

```ts
import { createDropZone } from '@vielzeug/dnd';

const dropzone = document.getElementById('dropzone')!;

const zone = createDropZone({
  element: dropzone,
  onDrop: (files) => {
    console.log('Accepted files:', files);
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

Gate drops behind an async check with `onValidate`. The zone remains `validating: true` until every pending validation settles, and disposal aborts each validation signal.

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*'],
  onValidate: async (files, { signal }) => {
    const ok = await checkServerQuota(files, { signal });
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
const boardScope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => {
    persistMove(itemId, sourceIds, targetIds);
  },
  touch: true,
});

createSortable({
  element: todoEl,
  getKey: (el) => el.dataset.sortId!,
  scope: boardScope,
});
createSortable({
  element: doneEl,
  getKey: (el) => el.dataset.sortId!,
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

`onBeforeReorder` fires just before the DOM reorder commits, for both drag and keyboard moves. Pair it with [`captureLayout()`](/necromancer/api.md#capturelayout) to animate the resulting layout without managing rectangles, transforms, or animation frames yourself.

```ts
import { captureLayout, type LayoutTransition } from '@vielzeug/necromancer';

let layout: LayoutTransition | undefined;

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onBeforeReorder: () => {
    layout = captureLayout(listEl.querySelectorAll('[data-sort-id]'), {
      getKey: (el) => el.dataset.sortId!,
    });
  },
  onReorder: ({ ids }) => {
    saveOrder(ids); // Commit a framework render here when needed.
    layout?.animate({
      duration: 200,
      easing: 'ease-out',
      elements: listEl.querySelectorAll('[data-sort-id]'),
    });
    layout = undefined;
  },
});
```

If `saveOrder()` triggers a render that replaces list items, call `layout?.animate({ elements: committedItems })` after that render commits. When DnD's own reordered elements remain in the DOM, call `layout?.animate()` directly. DnD stays dependency-free: the application chooses to install and import Necromancer when it wants this integration.

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

HTML5 drag-and-drop has no native touch story. Enable touch on a sortable scope; it only recognizes items registered to that scope, never unrelated `draggable` elements.

```ts
import { createSortable, createSortableScope } from '@vielzeug/dnd';

using scope = createSortableScope({ touch: true });
using sortable = createSortable({ element: listEl, getKey: (el) => el.dataset.id!, scope });
```

The scope tracks the touch that initiated the drag by its identifier. Additional fingers cannot move, finish, or replace the active drag. If the initiating touch is cancelled, Dnd restores the original item order and removes the transient preview.

### Touch preview

Touch uses an inert outline by default, avoiding cloned application DOM. Provide a preview factory or opt out when your item styling supplies its own feedback.

```ts
const scope = createSortableScope({
  touch: {
    // The returned element is cloned before Dnd mounts it as a transient preview.
    preview: (item) => item.querySelector<HTMLElement>('.drag-preview'),
  },
});
```

### Why draggable items get `touch-action: none`

`createSortable` sets `touch-action: none` on every element it marks as draggable (the item itself, or the handle when `handle` is set). This prevents a mobile browser from treating the initial movement as page scrolling before the scope controller can start the drag.

This has no effect on mouse/pointer input.

## Testing

Test observable callbacks and controller state with your DOM test runner. Construct the zone in each test, dispatch a real `drop` event, then dispose it during teardown.

```ts
import { afterEach, expect, it, vi } from 'vitest';
import { createDropZone } from '@vielzeug/dnd';

const zones: Array<{ dispose(): void }> = [];

afterEach(() => zones.splice(0).forEach((zone) => zone.dispose()));

it('forwards accepted files', async () => {
  const element = document.createElement('div');
  const onDrop = vi.fn();
  const zone = createDropZone({ element, onDrop });
  zones.push(zone);
  const file = new File(['content'], 'readme.txt', { type: 'text/plain' });
  const event = new Event('drop') as DragEvent;

  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
  element.dispatchEvent(event);

  await Promise.resolve();

  expect(onDrop).toHaveBeenCalledWith([file]);
  expect(zone.disposed).toBe(false);
});
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
- Enable `touch: true` only on scopes that own touch-sortable lists.
