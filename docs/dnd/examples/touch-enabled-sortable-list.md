---
title: 'Dnd Examples — Touch-enabled sortable list'
description: 'Touch-enabled sortable list example for @vielzeug/dnd.'
---

## Touch-enabled sortable list

### Problem

Your sortable list works with mouse drag but does nothing on touch devices — HTML drag-and-drop has no reliable native touch equivalent, so Dnd uses Gesture's Pointer Event recognizer to drive the drag lifecycle on touch input.

### Solution

Enable touch input on the scope that owns the list. The scope only handles its registered sortable items.

```html
<ul id="list">
  <li data-sort-id="a">Item A</li>
  <li data-sort-id="b">Item B</li>
  <li data-sort-id="c">Item C</li>
</ul>
```

```ts
import { createSortable, createSortableScope } from '@vielzeug/dnd/sortable';

using scope = createSortableScope({ touch: true });

using sortable = createSortable({
  element: document.getElementById('list')!,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ after }) => {
    console.log('New order:', after);
  },
  scope,
});
```

### Pitfalls

- A touch-enabled scope applies `touch-action: none` to its sortable items or handles; non-touch sortables preserve native scrolling.
- One touch-enabled scope can coordinate every connected list it owns.
- Gesture tracks one primary touch pointer; additional contacts are ignored.
- Cancelling the active pointer restores the original order.
- The default preview is an inert outline. Configure `touch.preview` when a custom preview is necessary.

### Related

- [Sortable list](./sortable-list.md)
- [Usage guide — Touch Support](../usage.md#touch-support)
