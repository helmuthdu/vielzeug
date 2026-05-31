---
title: 'Grip Examples — File upload drop zone'
description: 'File upload drop zone example for @vielzeug/grip.'
---

## File upload drop zone

### Problem

Users need to upload files by dragging from the OS file browser or by pasting from the clipboard. The drop target should highlight on hover, reject wrong MIME types, gate on server quota before accepting, and pass accepted files to your upload handler.

### Solution

A drop zone with hover feedback, type filtering, async quota validation, and clipboard paste support:

```html
<div id="dropzone" class="dropzone" tabindex="0" role="button" aria-label="Drop or paste files here">
  <p>Drop files here, paste from clipboard, or click to browse</p>
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

.dropzone.validating {
  opacity: 0.7;
  cursor: wait;
}
```

```ts
import { createDropZone } from '@vielzeug/grip';

const el = document.getElementById('dropzone')!;

using zone = createDropZone({
  element: el,
  accept: ['image/*', '.pdf'],
  maxFiles: 10,
  paste: true,

  onValidate: async (files) => {
    // files here are only the type-accepted ones; already-rejected files
    // are forwarded to onDropRejected unconditionally.
    el.classList.add('validating');
    const ok = await checkServerQuota(files);
    el.classList.remove('validating');
    return ok; // false → all accepted files forwarded to onDropRejected
  },

  onDrop: (files) => {
    for (const file of files) {
      upload(file);
    }
  },

  // onPaste falls back to onDrop when omitted;
  // provide it separately to handle paste uploads differently.
  onPaste: (files) => {
    for (const file of files) {
      upload(file);
    }
  },

  onDropRejected: (files, event) => {
    // event is ClipboardEvent when rejection came from a paste
    const source = event instanceof ClipboardEvent ? 'paste' : 'drop';
    showToast(`${files.length} file(s) rejected (${source}). Only images and PDFs up to quota are allowed.`);
  },

  onHoverChange: (hovered) => {
    el.classList.toggle('drag-over', hovered);
  },
});
```

### Pitfalls

- `e.dataTransfer.items[i].type` can be an empty string for files with unknown MIME types. Extension-based accept patterns (e.g. `.pdf`) cannot be validated from `DataTransferItem` during drag — Grip lets them through the pre-check and applies exact filtering at drop time.
- `zone.hovered` is only `true` when the drag payload matches the `accept` filter. Drags carrying rejected types do not trigger `onHoverChange`.
- `onValidate` only receives type-accepted files. Files already rejected by the `accept` filter are forwarded to `onDropRejected` regardless of what `onValidate` returns.
- `zone.validating` is `true` while an `onValidate` promise is pending. Use it to render a spinner or disable the UI during the async check.
- The `paste` listener is attached to `window`, not the element. Any file paste anywhere on the page triggers it while the zone is active.

### Related

- [Optimistic reorder with revert](./optimistic-reorder-with-revert.md)
- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [Framework Integration](../usage.md#framework-integration)
- [Sortable list](./sortable-list.md)
