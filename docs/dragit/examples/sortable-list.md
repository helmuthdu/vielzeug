---
title: 'Dragit Examples — Sortable list'
description: 'Sortable list examples for dragit.'
---

## Sortable list

## Problem

Implement sortable list in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

A basic reorderable list with a visible drag handle and placeholder styling:

```html
<ul id="list">
  <li data-sort-id="a"><span class="handle">⠿</span> Item A</li>
  <li data-sort-id="b"><span class="handle">⠿</span> Item B</li>
  <li data-sort-id="c"><span class="handle">⠿</span> Item C</li>
</ul>
```

```css
.handle {
  cursor: grab;
  user-select: none;
  margin-right: 0.5rem;
  color: var(--color-contrast-400);
}

[data-dragging] {
  opacity: 0.3;
}

.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}
```

```ts
import { createSortable } from '@vielzeug/dragit';

using sortable = createSortable({
  container: document.getElementById('list')!,
  handle: '.handle',
  onReorder: (ids) => {
    console.log('New order:', ids); // ['b', 'a', 'c']
    saveOrder(ids);
  },
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](./framework-integration.md)
