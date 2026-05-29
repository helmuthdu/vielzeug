---
title: 'Grip Examples — File upload drop zone'
description: 'File upload drop zone example for @vielzeug/grip.'
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
import { createDropZone } from '@vielzeug/grip';

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

- `e.dataTransfer.items[i].type` can be an empty string for files with unknown MIME types. Extension-based accept patterns (e.g. `.pdf`) cannot be validated from `DataTransferItem` during drag — Grip lets them through pre-check and applies exact filtering at drop time.
- `zone.hovered` is only `true` when the drag payload matches the `accept` filter. Drags carrying rejected types do not trigger `onHoverChange`.
- Add `maxFiles` when you need to enforce an upload limit — excess files are automatically forwarded to `onDropRejected`.

### Related

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [Framework Integration](../usage.md#framework-integration)
- [Sortable list](./sortable-list.md)
