---
title: 'Dnd Examples — Optimistic reorder with revert and FLIP animation'
description: 'Optimistic reorder, server rollback with revert(), and FLIP animation using onBeforeReorder in @vielzeug/dnd.'
---

## Optimistic reorder with revert and FLIP animation

### Problem

You want drag-and-drop reordering to feel instant: the UI updates immediately without waiting for the server, but if the server returns an error you need to roll the list back to its previous state. You also want a smooth animation when items move.

### Solution

Use `onBeforeReorder` with Necromancer's `captureLayout()` for a FLIP animation and call `event.setRevert(fn)` inside `onReorder` so `sortable.revert()` can roll back on failure:

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
  <li data-sort-id="task-4">Deploy</li>
</ul>
```

```ts
import { applyReorder, createSortable } from '@vielzeug/dnd';
import { captureLayout, type LayoutTransition } from '@vielzeug/necromancer';

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
const saveTasks = async (_orderedIds: string[]) => undefined;
let layout: LayoutTransition | undefined;

const sortable = createSortable({
  element: listEl,
  keyboard: true,

  onBeforeReorder: () => {
    layout = captureLayout(listEl.querySelectorAll('[data-sort-id]'), {
      getKey: (item) => item.dataset.sortId!,
    });
  },

  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids, setRevert }) => {
    const previous = tasks;
    tasks = applyReorder(tasks, ids, (t) => t.id);

    // DnD has committed the reorder. Passing items also supports renderers
    // that replaced the original nodes while applying the new task order.
    layout?.animate({
      duration: 200,
      easing: 'ease-out',
      elements: listEl.querySelectorAll('[data-sort-id]'),
    });
    layout = undefined;

    // Register a revert function — sortable.revert() will call this on failure.
    setRevert(() => {
      tasks = previous;
      renderList(tasks);
    });

    void saveTasks(ids).catch(() => sortable.revert());
  },
});

function renderList(next: Task[]) {
  listEl.replaceChildren(
    ...next.map((task) => {
      const item = document.createElement('li');

      item.dataset.sortId = task.id;
      item.textContent = task.title;

      return item;
    }),
  );
  sortable.sync();
}
```

### How it works

1. `onBeforeReorder(from, to)` fires before the DOM reorders. `captureLayout()` records the item positions by stable key.
2. The DOM commits (or your renderer replaces the items).
3. `onReorder({ ids, setRevert })` updates the data array, then `layout.animate()` targets the committed items.
4. If the server call fails, call `sortable.revert()`. It invokes the stored revert function and clears it so subsequent failures are no-ops.

Only the **most recent** reorder can be reverted — a new reorder overwrites the stored revert function.

`onBeforeReorder` fires for both drag and keyboard moves.

### Pitfalls

- Do not call `sortable.revert()` after a successful save — it is a destructive operation.
- If items are removed from the DOM between `onReorder` and the server response, `renderList` must reconcile the current DOM state before syncing, then call `sortable.sync()`.
- Call `layout.animate()` only after the renderer has committed the new elements. Its keys must be unique and non-empty in both the captured and committed collections.

### Related

- [Sortable list](./sortable-list.md)
- [Connected kanban with keyboard sorting](./connected-kanban-keyboard-sorting.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Usage: FLIP animation hook](../usage.md#flip-animation-hook)
- [Usage: Optimistic updates and revert](../usage.md#optimistic-updates-and-revert)
