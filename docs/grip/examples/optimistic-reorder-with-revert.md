---
title: 'Grip Examples — Optimistic reorder with revert and FLIP animation'
description: 'Optimistic reorder, server rollback with revert(), and FLIP animation using onBeforeReorder in @vielzeug/grip.'
---

## Optimistic reorder with revert and FLIP animation

### Problem

You want drag-and-drop reordering to feel instant: the UI updates immediately without waiting for the server, but if the server returns an error you need to roll the list back to its previous state. You also want a smooth animation when items move.

### Solution

Use `onBeforeReorder` to snapshot element positions for a FLIP animation and return a revert function from `onReorder` so `sortable.revert()` can roll back on failure:

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
  <li data-sort-id="task-4">Deploy</li>
</ul>
```

```css
[data-sort-id] {
  transition: transform 200ms ease;
}
```

```ts
import { applyReorder, createSortable } from '@vielzeug/grip';

interface Task {
  id: string;
  title: string;
}

let tasks: Task[] = [
  { id: 'task-1', title: 'Design' },
  { id: 'task-2', title: 'Develop' },
  { id: 'task-3', title: 'Review' },
  { id: 'task-4', title: 'Deploy' },
];

const listEl = document.getElementById('task-list') as HTMLUListElement;

const sortable = createSortable({
  element: listEl,
  keyboard: true,

  onBeforeReorder: (_from, _to) => {
    // Items are still in their pre-commit DOM positions here.
    // Snapshot the bounding rect of every item for the FLIP animation.
    const rects = new Map<string, DOMRect>();

    for (const item of listEl.querySelectorAll<HTMLElement>('[data-sort-id]')) {
      rects.set(item.dataset.sortId!, item.getBoundingClientRect());
    }

    // After the DOM commits, animate from the old rect to the new one.
    requestAnimationFrame(() => {
      for (const item of listEl.querySelectorAll<HTMLElement>('[data-sort-id]')) {
        const before = rects.get(item.dataset.sortId!);
        const after = item.getBoundingClientRect();

        if (!before) continue;

        const dy = before.top - after.top;

        if (dy === 0) continue;

        // Jump to old position, then transition to new.
        item.style.transition = 'none';
        item.style.transform = `translateY(${dy}px)`;

        requestAnimationFrame(() => {
          item.style.transition = 'transform 200ms ease';
          item.style.transform = '';
        });
      }
    });
  },

  onReorder: (orderedIds) => {
    const previous = tasks;
    tasks = applyReorder(tasks, orderedIds, (t) => t.id);

    // Return a revert function — sortable.revert() will call this on failure.
    return () => {
      tasks = previous;
      renderList(tasks);
    };
  },
});

async function handleReorder(orderedIds: string[]) {
  try {
    await api.saveTasks(orderedIds);
  } catch {
    // Server rejected the new order — roll back the optimistic update.
    sortable.revert();
  }
}
```

### How it works

1. `onBeforeReorder(from, to)` fires before the DOM reorders. Record element positions here.
2. The DOM commits (items move to their new positions).
3. `onReorder(orderedIds)` fires. Update your data array optimistically and return a revert function.
4. If the server call fails, call `sortable.revert()`. It invokes the stored revert function and clears it so subsequent failures are no-ops.

Only the **most recent** reorder can be reverted — a new reorder overwrites the stored revert function.

`onBeforeReorder` fires for both drag and keyboard moves.

### Pitfalls

- Do not call `sortable.revert()` after a successful save — it is a destructive operation.
- If items are removed from the DOM between `onReorder` and the server response, `renderList` must reconcile the current DOM state before syncing, then call `sortable.sync()`.
- The CSS `transition` on `[data-sort-id]` must be applied **after** the initial `translateY` is set (the `requestAnimationFrame` double-raf pattern ensures this).

### Related

- [Sortable list](./sortable-list.md)
- [Connected kanban with keyboard sorting](./connected-kanban-keyboard-sorting.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Usage: FLIP animation hook](../usage.md#flip-animation-hook)
- [Usage: Optimistic updates and revert](../usage.md#optimistic-updates-and-revert)
