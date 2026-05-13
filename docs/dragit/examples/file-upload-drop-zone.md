---
title: 'Dragit Examples — File upload drop zone'
description: 'File upload drop zone examples for dragit.'
---

## File upload drop zone

### Problem

Users need to upload files by dragging from the OS file browser. The drop target should highlight on hover, reject wrong MIME types, and pass accepted files to your upload handler.

### Solution

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


### Pitfalls

- `dragover` must call `e.preventDefault()` to mark the element as a valid drop target. Without it, `drop` never fires.
- `e.dataTransfer.files` is a `FileList`, not an array. Convert with `Array.from()` before filtering or mapping.
- `e.dataTransfer.items[i].type` can be an empty string for files with unknown MIME types. Always provide a fallback to avoid silently rejecting valid files.

### Related

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [Framework Integration](../usage.md#framework-integration)
- [Sortable list](./sortable-list.md)
