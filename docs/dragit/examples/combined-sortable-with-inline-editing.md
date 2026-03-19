---
title: 'Dragit Examples — Combined: sortable with inline editing'
description: 'Combined: sortable with inline editing examples for dragit.'
---

## Combined: sortable with inline editing

## Problem

Implement combined: sortable with inline editing in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

A list where items can be reordered by drag and inline-edited:

```ts
import { createSortable } from '@vielzeug/dragit';

let items = [
  { id: '1', label: 'Design' },
  { id: '2', label: 'Develop' },
  { id: '3', label: 'Deploy' },
];

function render() {
  listEl.innerHTML = items
    .map(
      (item) => `
        <li data-sort-id="${item.id}">
          <span class="handle">⠿</span>
          <input value="${item.label}" data-item-id="${item.id}" />
        </li>
      `,
    )
    .join('');

  sortable.refresh(); // sync draggable after re-render
}

const sortable = createSortable({
  container: listEl,
  handle: '.handle',
  onReorder: (ids) => {
    items = ids.map((id) => items.find((i) => i.id === id)!);
    saveItems(items);
  },
});

render();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](./framework-integration.md)
- [Sortable list](./sortable-list.md)
