---
title: 'Grip Examples — Web Component with craft'
description: 'Web Component with craft examples for grip.'
---

## Web Component with craft

### Problem

You are building a Craft web component that contains a sortable list. The drag-and-drop lifecycle must be tied to the component's own mount and unmount so it does not leak after the element is removed from the DOM.

### Solution

```ts
import { define, html, onCleanup, ref, signal } from '@vielzeug/craft';
import { createDropZone } from '@vielzeug/grip';

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

- `makeSortable()` must be called after the element is connected to the DOM — inside `onMounted`, not the constructor. The scroll container does not exist before connection.
- Each Craft component instance needs its own sortable instance. Sharing one across instances causes them to manipulate each other's DOM.
- Return the sortable's `dispose` from `onMounted` so Craft calls it in `disconnectedCallback` automatically.

### Related
- [With Craft Component (Orbit)](@vielzeug/orbit/examples/with-craft-component)

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
