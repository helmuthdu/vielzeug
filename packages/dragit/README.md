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
  element: document.getElementById('list')!,
  group: 'kanban',
  keyboard: true,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  dragImage: (id, item) => item,
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
- ✅ **Dynamic lists** — `MutationObserver` keeps `draggable`/`role` in sync after adding or removing items
- ✅ **Axis support** — choose vertical or horizontal midpoint logic via `axis`
- ✅ **Connected lists** — move items across containers with shared `group`
- ✅ **Keyboard sorting** — reorder focused items with Arrow keys and Home/End
- ✅ **Auto-scroll** — scroll container/viewport near edges while dragging
- ✅ **Custom drag preview** — provide `dragImage` to control native drag ghost
- ✅ **Custom placeholder class** — style drop markers with your own class name
- ✅ **`[Symbol.dispose]`** — supports the `using` keyword for automatic teardown
- ✅ **Reactive-friendly options** — pass functions for `disabled` and `accept`
- ✅ **Array reorder helper** — `applyReorder(items, orderedIds, getId)` maps DOM order back to your data
- ✅ **Zero dependencies**

## Usage

### Drop Zone

```ts
import { createDropZone } from '@vielzeug/dragit';

const zone = createDropZone({
  element: dropEl,
  accept: () => ['image/*', '.pdf'],
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

// Zone snapshot
console.log(zone.hovered); // boolean
console.log(zone.files); // accepted files from last drop
console.log(zone.rejected); // rejected files from last drop

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
  element: document.getElementById('list')!,
  group: 'kanban',
  axis: 'vertical', // or 'horizontal'
  handle: '.drag-handle', // optional — scope drag to a child selector
  keyboard: true, // default: true
  autoScroll: true, // or { edgeThreshold, speed }
  dragImage: (id, item, event) => item,
  placeholderClass: 'dragit-placeholder',
  disabled: () => isLocked,
  onDragStart: (id, event) => {
    console.log('dragging', id);
  },
  onDragEnd: (id, event) => {
    console.log('drag ended', id);
  },
  onReorder: (ids) => {
    saveOrder(ids);
  }, // only fires when order changes
});

// Cleanup
sortable.destroy();
// or: using sortable = createSortable(...)
```

### Styling the drop indicator

Target `.dragit-placeholder` in your CSS to style the placeholder shown while dragging:

```css
.dragit-placeholder {
  background: #eff6ff;
  border: 2px dashed #93c5fd;
  border-radius: 4px;
  box-sizing: border-box;
}
```

## Documentation

Full docs at **[vielzeug.dev/dragit](https://vielzeug.dev/dragit)**

| | |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/dragit/usage) | Drop zones, accept filtering, sortable lists |
| [API Reference](https://vielzeug.dev/dragit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/dragit/examples) | Real-world drag-and-drop patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
