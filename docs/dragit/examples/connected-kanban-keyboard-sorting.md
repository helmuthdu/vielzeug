---
title: 'Dragit Examples — Connected kanban with keyboard sorting'
description: 'Connected multi-list sortable example with group transfer and keyboard reordering.'
---

## Connected kanban with keyboard sorting

## Problem

Implement connected sortable columns where cards can move across lists and also be reordered with the keyboard.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

Two connected lists using the same `group` value (`board`) plus keyboard reorder support:

```html
<section class="board">
  <div>
    <h3>Todo</h3>
    <ul id="todo-list" class="lane">
      <li data-sort-id="t-1"><span class="handle">⠿</span> Draft API</li>
      <li data-sort-id="t-2"><span class="handle">⠿</span> Add tests</li>
      <li data-sort-id="t-3"><span class="handle">⠿</span> Write docs</li>
    </ul>
  </div>

  <div>
    <h3>Done</h3>
    <ul id="done-list" class="lane">
      <li data-sort-id="d-1"><span class="handle">⠿</span> Setup package</li>
    </ul>
  </div>
</section>
```

```css
.board {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lane {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  min-height: 10rem;
  border: 1px solid var(--color-contrast-200);
  border-radius: 0.5rem;
  background: var(--color-bg-soft);
}

.lane > li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  background: var(--color-bg-default);
}

.handle {
  cursor: grab;
  user-select: none;
  color: var(--color-contrast-500);
}

.lane > li:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.dragit-placeholder {
  border: 2px dashed var(--color-primary-300);
  border-radius: 0.375rem;
  background: var(--color-primary-50);
  box-sizing: border-box;
}

[data-dragging] {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}
```

```ts
import { createSortable } from '@vielzeug/dragit';

const todoEl = document.getElementById('todo-list')!;
const doneEl = document.getElementById('done-list')!;

const saveTodoOrder = (ids: string[]) => {
  console.log('Todo order:', ids);
};

const saveDoneOrder = (ids: string[]) => {
  console.log('Done order:', ids);
};

using todoSortable = createSortable({
  element: todoEl,
  group: 'board',
  handle: '.handle',
  keyboard: true,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  onReorder: saveTodoOrder,
});

using doneSortable = createSortable({
  element: doneEl,
  group: 'board',
  handle: '.handle',
  keyboard: true,
  onReorder: saveDoneOrder,
});
```

Keyboard behavior:

- Focus any card.
- Use arrow keys to move it by one position.
- Use `Home` and `End` to move to list boundaries.

## Expected Output

- Dragging cards between columns updates the target list and source list orders.
- Keyboard moves reorder focused items without additional wiring.
- `onReorder` for each list only fires when that list order changed.

## Common Pitfalls

- Lists must share the same `group` string to allow cross-list movement.
- Every sortable item still needs a stable identity attribute (`data-sort-id` by default).
- If your app uses strict read-only modes, wire `disabled` to block drag and keyboard reorder consistently.

## Related Recipes

- [Sortable list](./sortable-list.md)
- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [Framework Integration](./framework-integration.md)
