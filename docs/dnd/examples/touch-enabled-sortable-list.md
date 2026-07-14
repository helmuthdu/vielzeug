---
title: 'Dnd Examples — Touch-enabled sortable list'
description: 'Touch-enabled sortable list example for @vielzeug/dnd.'
---

## Touch-enabled sortable list

### Problem

Your sortable list works with mouse drag but does nothing on touch devices — HTML5 drag-and-drop has no native touch equivalent, so `touchstart`/`touchmove`/`touchend` never produce `dragstart`/`dragover`/`drop`.

### Solution

Install `createTouchDragShim()` once at app startup, alongside your normal `createSortable()` setup. No per-list wiring needed — it bridges touch gestures to the same synthetic `DragEvent` sequence `createSortable` already listens for.

```html
<ul id="list">
  <li data-sort-id="a">Item A</li>
  <li data-sort-id="b">Item B</li>
  <li data-sort-id="c">Item C</li>
</ul>
```

```css
#list li {
  /* Prevent touch drags from scrolling the page instead of dragging the item. */
  touch-action: none;
}
```

```ts
import { createSortable, createTouchDragShim } from '@vielzeug/dnd';

// Call once for the whole app — a single document-level bridge covers every
// sortable/drop-zone on the page, not just this one list.
using touchDrag = createTouchDragShim();

using sortable = createSortable({
  element: document.getElementById('list')!,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => {
    console.log('New order:', ids);
    saveOrder(ids);
  },
});
```

### Pitfalls

- `touch-action: none` (or `none` on the drag handle) is still required — the shim makes touch produce drag events, it doesn't stop the browser's own scroll gesture from competing with it.
- Create one `createTouchDragShim()` per app, not one per list — it listens at the `document` level, so a second instance just duplicates the same listeners.
- The shim's default `draggableSelector` (`[draggable="true"]`) already matches what `createSortable`/`createDropZone` set automatically. Only pass a custom selector if you're managing `draggable` yourself.

### Related

- [Sortable list](./sortable-list.md)
- [Usage guide — Touch Support](../usage.md#touch-support)
