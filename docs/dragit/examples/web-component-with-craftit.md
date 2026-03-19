---
title: 'Dragit Examples — Web Component with craftit'
description: 'Web Component with craftit examples for dragit.'
---

## Web Component with craftit

## Problem

Implement web component with craftit in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

```ts
import { define, html, onCleanup, onMount, ref, signal } from '@vielzeug/craftit';
import { createDropZone } from '@vielzeug/dragit';

define('my-dropzone', (props) => {
  const isDragging = signal(false);
  const dropzoneRef = ref<HTMLElement>();

  onMount(() => {
    const el = dropzoneRef.value!;

    const zone = createDropZone({
      element: el,
      accept: ['image/*'],
      onDrop: (files) => {
        /* handle upload */
      },
      onHoverChange: (hovered) => {
        isDragging.value = hovered;
      },
    });

    onCleanup(() => zone.destroy());
  });

  return {
    template: html`
      <div ref=${dropzoneRef} class="dropzone" :class=${{ 'drag-over': () => isDragging.value }}>
        <slot>Drop images here</slot>
      </div>
    `,
  };
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
