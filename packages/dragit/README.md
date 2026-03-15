# @vielzeug/dragit

> Drag-and-drop primitives for the DOM

[![npm version](https://img.shields.io/npm/v/@vielzeug/dragit)](https://www.npmjs.com/package/@vielzeug/dragit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Dragit** is a framework-agnostic drag-and-drop library with two focused primitives: a drop zone for file drag-and-drop, and a sortable list. Both wrap the HTML Drag & Drop API with correct counter-based hover state, MIME type filtering with pre-validation during drag, and full lifecycle management.

## Installation

```sh
pnpm add @vielzeug/dragit
# npm install @vielzeug/dragit
# yarn add @vielzeug/dragit
```

## Quick Start

```ts
import { createDropZone, createSortable } from '@vielzeug/dragit';

// Drop zone — file drag-and-drop with accept filtering
using zone = createDropZone({
  element: document.getElementById('dropzone')!,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    console.log('Accepted:', files);
  },
  onDropRejected: (files) => {
    console.log('Rejected:', files);
  },
  onHoverChange: (hovered) => {
    document.getElementById('dropzone')!.classList.toggle('drag-over', hovered);
  },
});

// Sortable list — reorder items via drag
using sortable = createSortable({
  container: document.getElementById('list')!,
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

## Features

- ✅ **Counter-based hover** — `onHoverChange` never fires spuriously when dragging over child elements
- ✅ **MIME type pre-validation** — sets `dropEffect='none'` during drag via `dataTransfer.items`; confirms on drop via `File.type`
- ✅ **Accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and extensions (`.pdf`)
- ✅ **`onDropRejected`** — receive the files that didn't match `accept`, separate from accepted files
- ✅ **Sortable lists** — reorders DOM children via native drag, emits only when order actually changes
- ✅ **Drag handles** — scope dragging to a child selector via `handle`
- ✅ **Dynamic lists** — `sortable.refresh()` syncs `draggable`/`role` after adding or removing items
- ✅ **`[Symbol.dispose]`** — supports the `using` keyword for automatic teardown
- ✅ **Reactive-friendly `disabled`** — pass `() => signal.value` for framework-derived state
- ✅ **Zero dependencies**

## Usage

### Drop Zone

```ts
import { createDropZone } from '@vielzeug/dragit';

const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf'],
  dropEffect: 'copy', // 'copy' | 'move' | 'link' | 'none'
  disabled: () => isReadOnly,
  onDrop: (files, event) => {
    uploadFiles(files);
  },
  onDropRejected: (files) => {
    showError(`${files.length} file(s) not accepted`);
  },
  onHoverChange: (hovered) => {
    dropEl.classList.toggle('drag-over', hovered);
  },
});

// Zone state
console.log(zone.hovered); // boolean

// Cleanup
zone.destroy();
// or: using zone = createDropZone(...)
```

### Sortable List

Each sortable item must carry a `data-sort-id` attribute. `createSortable` sets `draggable="true"` and `role="listitem"` on all matching children automatically.

```html
<ul id="list">
  <li data-sort-id="a">Item A</li>
  <li data-sort-id="b">Item B</li>
  <li data-sort-id="c">Item C</li>
</ul>
```

```ts
import { createSortable } from '@vielzeug/dragit';

const sortable = createSortable({
  container: document.getElementById('list')!,
  handle: '.drag-handle', // optional — scope drag to a child selector
  disabled: () => isLocked,
  onDragStart: (id, event) => {
    console.log('dragging', id);
  },
  onDragEnd: (event) => {
    console.log('drag ended');
  },
  onReorder: (ids) => {
    saveOrder(ids);
  }, // only fires when order changes
});

// After adding new items to the DOM:
sortable.refresh();

// Cleanup
sortable.destroy();
// or: using sortable = createSortable(...)
```

### Styling the drop indicator

Target `.dragit-placeholder` in your CSS to style the placeholder shown while dragging:

```css
.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}
```

## Documentation

Full documentation at [vielzeug.dev/dragit](https://vielzeug.dev/dragit/).
