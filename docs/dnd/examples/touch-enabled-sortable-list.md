---
title: 'Dnd Examples — Touch-enabled sortable list'
description: 'Touch-enabled sortable list example for @vielzeug/dnd.'
---

## Touch-enabled sortable list

### Problem

Your sortable list works with mouse drag but does nothing on touch devices — HTML5 drag-and-drop has no native touch equivalent, so `touchstart`/`touchmove`/`touchend` never produce `dragstart`/`dragover`/`drop`.

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
import { createSortable, createSortableScope } from '@vielzeug/dnd';

using scope = createSortableScope({ touch: true });

using sortable = createSortable({
  element: document.getElementById('list')!,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids }) => {
    console.log('New order:', ids);
  },
  scope,
});
```

### Pitfalls

- `createSortable` applies `touch-action: none` to sortable items or handles automatically.
- One touch-enabled scope can coordinate every connected list it owns.
- The default preview is an inert outline. Configure `touch.preview` when a custom preview is necessary.

### Related

- [Sortable list](./sortable-list.md)
- [Usage guide — Touch Support](../usage.md#touch-support)
