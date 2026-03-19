---
title: 'Dragit Examples — File upload drop zone'
description: 'File upload drop zone examples for dragit.'
---

## File upload drop zone

## Problem

Implement file upload drop zone in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

A minimal file drop zone with hover feedback and type filtering:

```html
<div id="dropzone" class="dropzone" tabindex="0" role="button" aria-label="Drop files here">
  <p>Drop files here, or click to browse</p>
</div>
```

```css
.dropzone {
  border: 2px dashed var(--color-contrast-300);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition:
    background 150ms,
    border-color 150ms;
}

.dropzone.drag-over {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}
```

```ts
import { createDropZone } from '@vielzeug/dragit';

const el = document.getElementById('dropzone')!;

using zone = createDropZone({
  element: el,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    for (const file of files) {
      upload(file);
    }
  },
  onDropRejected: (files) => {
    showToast(`${files.length} file(s) not accepted. Only images and PDFs are allowed.`);
  },
  onHoverChange: (hovered) => {
    el.classList.toggle('drag-over', hovered);
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
- [Framework Integration](./framework-integration.md)
- [Sortable list](./sortable-list.md)
