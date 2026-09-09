---
title: Dnd — Usage Guide
description: Drop zones, sortable lists, explicit connected scopes, keyboard sorting, and cleanup patterns with Dnd.
---

[[toc]]

## Basic Usage

`createDropZone` attaches drag-and-drop behavior to any DOM element and keeps hover state stable with a counter.

```ts
import { createDropZone } from '@vielzeug/dnd/drop';

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

The `accept` list is normalized and snapshotted at construction. MIME matching is case-insensitive; invalid patterns throw `DndError`. Recreate the zone to change accepted types.

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

`maxFiles` must be a non-negative safe integer.

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

Set `paste: true` to accept files pasted through the drop-zone element. The focused paste target must be the element or its descendant; the same `accept`, `maxFiles`, and `onValidate` pipeline applies.

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
  onReorder: ({ after }) => {
    saveTaskOrder(after);
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
  onReorder: ({ after }) => saveOrder(after),
});
```

### Keyboard reordering

Focus an item and use arrow keys to move it. `Home` and `End` move to the boundary positions.

When an item is already at the first or last position, the boundary key press is not consumed — the browser handles it normally (for example, scrolling the page). Only keys that actually move an item call `preventDefault`. Arrow keys from buttons, links, form fields, and editable descendants remain native unless that descendant matches the configured drag handle. Wire `onInteraction` to an application live region for screen-reader announcements.

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
  onReorder: ({ after }) => saveOrder(after),
});
```

### Custom identity function

```ts
createSortable({
  element: listEl,
  getKey: (el) => el.getAttribute('data-id')!,
  onReorder: ({ after }) => saveOrder(after),
});
```

### Dynamic lists

Call `sortable.refresh()` after adding, removing, or replacing sortable items. It restores Dnd-managed semantics on elements no longer returned by `items()` before marking the current direct children.

```ts
const item = document.createElement('li');
item.dataset.sortId = 'task-4';
item.textContent = 'Deploy';
listEl.appendChild(item);
sortable.refresh();
```

### Disabled state

```ts
import { createSortable, type SortableOptions } from '@vielzeug/dnd/sortable';

const options: SortableOptions = {
  disabled: false,
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ after }) => saveOrder(after),
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
import { applyReorder, createSortable } from '@vielzeug/dnd/sortable';

let items = [
  { id: 'task-1', title: 'Design' },
  { id: 'task-2', title: 'Develop' },
  { id: 'task-3', title: 'Review' },
];

createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ after }) => {
    items = applyReorder(items, after, (item) => item.id);
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
  onReorder: ({ after }) => saveOrder(after),
});
```

### FLIP animation hook

`onBeforeReorder` fires just before the DOM reorder commits, for both drag and keyboard moves. Pair it with [`captureLayout()`](/necromancer/api.md#capturelayout) to animate the resulting layout without managing rectangles, transforms, or animation frames yourself.

```ts
import { captureLayout, type LayoutTransition } from '@vielzeug/necromancer';

let layout: LayoutTransition<HTMLElement> | undefined;

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onBeforeReorder: () => {
    layout = captureLayout(listEl.querySelectorAll<HTMLElement>('[data-sort-id]'), {
      getKey: (el) => el.dataset.sortId!,
    });
  },
  onReorder: ({ after }) => {
    saveOrder(after); // Commit a framework render here when needed.
    layout?.animate({
      duration: 200,
      easing: 'ease-out',
      elements: listEl.querySelectorAll('[data-sort-id]'),
    });
    layout = undefined;
  },
});
```

If `saveOrder()` triggers a render that replaces list items, call `layout?.animate({ elements: committedItems })` after that render commits. When DnD's own reordered elements remain in the DOM, call `layout?.animate()` directly. Dnd does not depend on Necromancer: the application installs it only when FLIP animation is required. Dnd's sole runtime dependency is Gesture for touch pointer recognition.

### Optimistic updates and rollback

The `onReorder` event carries `before`, `after`, and `item`. Application history owns rollback — use `before` to record an undo entry.

```ts
const history: Array<{ before: readonly string[] }> = [];

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ before, after }) => {
    history.push({ before });
    setOrder(after); // optimistic update
  },
});

// On server error:
try {
  await api.saveOrder(currentOrder);
} catch {
  const entry = history.pop();
  if (entry) setOrder(entry.before);
}
```

## Touch Support

The HTML Drag and Drop API has no reliable native touch path. Enable touch on a sortable scope; it only recognizes items registered to that scope, never unrelated `draggable` elements.

```ts
import { createSortable, createSortableScope } from '@vielzeug/dnd/sortable';

using scope = createSortableScope({ touch: true });
using sortable = createSortable({ element: listEl, getKey: (el) => el.dataset.id!, scope });
```

Gesture tracks the primary touch pointer for the active drag. Additional contacts cannot move, finish, or replace it. Pointer cancellation restores the original item order and removes the transient preview.

### Touch preview

Touch uses an inert outline by default, avoiding cloned application DOM. Provide a preview factory or opt out when your item styling supplies its own feedback.

```ts
const scope = createSortableScope({
  touch: {
    activationDistance: 8,
    // The returned element is cloned before Dnd mounts it as a transient preview.
    preview: (item) => item.querySelector<HTMLElement>('.drag-preview'),
  },
});
```

### Why touch-enabled items get `touch-action: none`

When a sortable scope enables touch input, `createSortable` sets `touch-action: none` on the managed item or handle. This prevents a mobile browser from claiming the gesture as page scrolling before the scope controller starts the drag. Sortables without touch input preserve native touch scrolling.

## Testing

Test observable callbacks and controller state with your DOM test runner. Construct the zone in each test, dispatch a real `drop` event, then dispose it during teardown.

```ts
import { afterEach, expect, it, vi } from 'vitest';
import { createDropZone } from '@vielzeug/dnd/drop';

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
import { createSortable, applyReorder } from '@vielzeug/dnd/sortable';

function SortableList({ initialItems }: { initialItems: { id: string; text: string }[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = useRef(initialItems);

  useEffect(() => {
    const sortable = createSortable({
      element: listRef.current!,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ after }) => {
        items.current = applyReorder(items.current, after, (i) => i.id);
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
import { createSortable, applyReorder, type Sortable } from '@vielzeug/dnd/sortable';

function useSortable(items: { id: string; text: string }[]) {
  const listRef = ref<HTMLElement | null>(null);
  const orderedItems = ref(items);
  let sortable: Sortable | null = null;

  onMounted(() => {
    sortable = createSortable({
      element: listRef.value!,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ after }) => {
        orderedItems.value = applyReorder(orderedItems.value, after, (i) => i.id);
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
  import { createSortable, applyReorder } from '@vielzeug/dnd/sortable';

  export let initialItems: { id: string; text: string }[] = [];
  let items = initialItems;
  let listEl: HTMLUListElement;

  onMount(() => {
    const sortable = createSortable({
      element: listEl,
      getKey: (el) => el.dataset.sortId!,
      onReorder: ({ after }) => { items = applyReorder(items, after, (i) => i.id); },
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
import { createSortable } from '@vielzeug/dnd/sortable';
import { define, getHost, html, onMounted } from '@vielzeug/ore';

define('task-list', {
  setup(_props) {
    const el = getHost();

    onMounted(() => {
      const sortable = createSortable({
        element: el,
        getKey: (el) => el.dataset.sortId!,
        onReorder: ({ after }) => save(after),
      });
      return () => sortable.dispose();
    });

    return html`<slot></slot>`;
  },
});
```

### With Gesture

Keep direct manipulation separate from drag-and-drop semantics. Use Gesture for one-axis surfaces that follow the pointer and let application code decide the outcome; use Dnd when an item enters a drag lifecycle and is dropped into a zone or reordered collection. Dnd touch sorting uses Gesture's two-dimensional pointer recognizer, then adds previews, hit-testing, synthetic drag events, and sortable transactions. Direct-manipulation consumers use Gesture without Dnd.

## Best Practices

- Attach `createDropZone` and `createSortable` after the container element is in the DOM — use `onMounted` in component frameworks.
- Call `.dispose()` in the cleanup phase of your framework (useEffect return, onUnmounted, onDestroy) to prevent memory leaks.
- Use `data-sort-id` attributes that match your data's identity field — do not use DOM index as an identifier.
- Prefer `applyReorder()` over manual array splicing, and guarantee unique backing keys; duplicates throw `DndError` rather than dropping data.
- Use `createSortableScope()` only when items should genuinely move between containers.
- Use drag handles (`.handle` selector) when the full item surface area conflicts with other interactions such as text selection.
- Test keyboard reordering explicitly — Dnd sets `tabindex` on items and supports arrow keys by default.
- Enable `touch: true` only on scopes that own touch-sortable lists.
