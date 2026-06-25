---
title: 'Dnd Examples — Web Component with ore'
description: 'Web component with Ore example for @vielzeug/dnd.'
---

## Web Component with ore

### Problem

You are building a Ore web component that contains a sortable list. The drag-and-drop lifecycle must be tied to the component's own mount and unmount so it does not leak after the element is removed from the DOM.

### Solution

```ts
import { define, html, onCleanup, ref, signal } from '@vielzeug/ore';
import { createDropZone } from '@vielzeug/dnd';

define('my-dropzone', (props) => {
  const isDragging = signal(false);
  const dropzoneRef = ref<HTMLElement>();

  return {
    mount() {
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
    },
    render: () => html`
      <div ref=${dropzoneRef} class="dropzone" :class=${{ 'drag-over': () => isDragging.value }}>
        <slot>Drop images here</slot>
      </div>
    `,
  };
});
```

### Pitfalls

- `createSortable()` and `createDropZone()` must be called after the element is connected to the DOM — inside `mount()`, not during component definition. The container element does not exist before connection.
- Each component instance needs its own `createSortable()` / `createDropZone()` instance. Sharing one across instances causes them to manipulate each other's DOM.
- Call `onCleanup(() => sortable.destroy())` (or `zone.destroy()`) inside `mount()` so the listener is removed when the component disconnects.

### Related

- [With Ore Component (Orbit)](@vielzeug/orbit/examples/with-ore-component)

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
