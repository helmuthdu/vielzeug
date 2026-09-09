---
title: 'Dnd Examples — Optimistic reorder with rollback and FLIP animation'
description: 'Optimistic reorder, application-owned server rollback, and FLIP animation using onBeforeReorder in @vielzeug/dnd.'
---

## Optimistic reorder with rollback and FLIP animation

### Problem

You want drag-and-drop reordering to feel instant: the UI updates immediately without waiting for the server, but if the server returns an error you need to roll the list back to its previous state. You also want a smooth animation when items move.

### Solution

Use `onBeforeReorder` with Necromancer's `captureLayout()` for a FLIP animation. The `onReorder` event carries `{ before, after, item }` — push `before` onto an application-owned history stack so you can roll back on failure:

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
  <li data-sort-id="task-4">Deploy</li>
</ul>
```

```ts
import { applyReorder, createSortable } from '@vielzeug/dnd/sortable';
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
let layout: LayoutTransition<HTMLElement> | undefined;

// Application-owned rollback stack — the sortable no longer holds revert state.
const history: Array<{ before: Task[] }> = [];

const sortable = createSortable({
  element: listEl,
  keyboard: true,

  onBeforeReorder: () => {
    layout = captureLayout(listEl.querySelectorAll<HTMLElement>('[data-sort-id]'), {
      getKey: (item) => item.dataset.sortId!,
    });
  },

  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ before, after }) => {
    history.push({ before: tasks });
    tasks = applyReorder(tasks, after, (t) => t.id);

    // DnD has committed the reorder. Passing items also supports renderers
    // that replaced the original nodes while applying the new task order.
    layout?.animate({
      duration: 200,
      easing: 'ease-out',
      elements: listEl.querySelectorAll('[data-sort-id]'),
    });
    layout = undefined;

    void saveTasks(after).catch(() => {
      const entry = history.pop();
      if (!entry) return;
      tasks = entry.before;
      renderList(tasks);
    });
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
  sortable.refresh();
}
```

### How it works

1. `onBeforeReorder(from, to)` fires before the DOM reorders. `captureLayout()` records the item positions by stable key.
2. The DOM commits (or your renderer replaces the items).
3. `onReorder({ before, after, item })` updates the data array, then `layout.animate()` targets the committed items.
4. If the server call fails, pop the history entry and restore `before`.

`onBeforeReorder` fires for both drag and keyboard moves.

### Pitfalls

- Do not roll back after a successful save — only pop the history entry on failure.
- If items are removed from the DOM between `onReorder` and the server response, `renderList` must reconcile the current DOM state before refreshing, then call `sortable.refresh()`.
- Call `layout.animate()` only after the renderer has committed the new elements. Its keys must be unique and non-empty in both the captured and committed collections.

### Related

- [Sortable list](./sortable-list.md)
- [Connected kanban with keyboard sorting](./connected-kanban-keyboard-sorting.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Usage: FLIP animation hook](../usage.md#flip-animation-hook)
- [Usage: Optimistic updates and rollback](../usage.md#optimistic-updates-and-rollback)
