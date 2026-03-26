---
title: Dragit — Drag-and-drop primitives for the DOM
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles — zero dependencies.
---

<PackageBadges package="dragit" />

<img src="/logo-dragit.svg" alt="Dragit logo" width="156" class="logo-highlight"/>

# Dragit

**Dragit** is a zero-dependency drag-and-drop library for the Document Object Model (DOM). It provides two focused primitives: a drop zone for file drag-and-drop with MIME type filtering and a sortable list for reordering elements. Both wrap the HTML Drag and Drop API with reliable hover state, full lifecycle management, and `using` keyword support.

<!-- Search keywords: drag and drop helper, file drop zone, sortable list utility. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/dragit
```

```sh [npm]
npm install @vielzeug/dragit
```

```sh [yarn]
yarn add @vielzeug/dragit
```

:::

## Quick Start

```ts
import { createDropZone, createSortable } from '@vielzeug/dragit';

// File drop zone
using zone = createDropZone({
  element: document.getElementById('dropzone')!,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    uploadFiles(files);
  },
  onDropRejected: (files) => {
    showError(`${files.length} file(s) not accepted`);
  },
  onHoverChange: (hovered) => {
    document.getElementById('dropzone')!.classList.toggle('drag-over', hovered);
  },
});

// Sortable list
using sortable = createSortable({
  element: document.getElementById('list')!,
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

## Why Dragit?

The HTML5 Drag & Drop API requires careful counter tracking to avoid hover state flicker, has no MIME type pre-filtering, and provides no sortable list abstraction.

```ts
// Before — raw HTML5 Drag & Drop
let enterCount = 0;
dropzone.addEventListener('dragenter', () => {
  enterCount++;
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', () => {
  if (--enterCount === 0) dropzone.classList.remove('over');
});
dropzone.addEventListener('dragover', (e) => e.preventDefault());
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  enterCount = 0;
  const files = [...e.dataTransfer!.files];
  if (!files.every((f) => f.type.startsWith('image/'))) return showError('Images only');
  uploadFiles(files);
});

// After — Dragit
import { createDropZone } from '@vielzeug/dragit';
const zone = createDropZone({
  element: dropzone,
  accept: ['image/*'],
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => showError(`${files.length} file(s) not accepted`),
  onHoverChange: (hovered) => dropzone.classList.toggle('over', hovered),
});
```

| Feature             | Dragit                                       | SortableJS | dnd-kit |
| ------------------- | -------------------------------------------- | ---------- | ------- |
| Bundle size         | <PackageInfo package="dragit" type="size" /> | ~15 kB     | ~30 kB  |
| Framework agnostic  | ✅                                           | ✅         | ✅      |
| MIME type filtering | ✅ Pre-validated                             | ❌         | ❌      |
| Counter-based hover | ✅                                           | ❌         | N/A     |
| Sortable lists      | ✅                                           | ✅         | ✅      |
| Drag handles        | ✅                                           | ✅         | ✅      |
| `using` support     | ✅                                           | ❌         | ❌      |
| Zero dependencies   | ✅                                           | ✅         | ❌      |

**Use Dragit when** you need reliable file drop zones with MIME filtering or sortable lists in a framework-agnostic environment.

**Consider dnd-kit** if you are building a React app and need complex multi-container drag interactions or accessibility-first sortable trees.

## Features

- **Counter-based hover state** — `onHoverChange` stays accurate when dragging over child elements; no spurious leave/enter flicker
- **MIME type pre-validation** — queries `dataTransfer.items` during drag to set `dropEffect='none'` before the drop; confirmed against `File.type` on drop
- **Flexible accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and file extensions (`.pdf`)
- **`onDropRejected`** — separate callback for files that didn't match `accept`; enables rejection UX without extra filtering logic
- **Sortable lists** — reorders DOM children with a placeholder indicator; fires `onReorder` only when the order actually changes
- **Drag handles** — scope dragging to a child selector via `handle`; whole item is draggable when omitted
- **Auto-synced items** — a `MutationObserver` re-syncs `draggable` and `role` attributes when list items are added or removed
- **`[Symbol.dispose]`** — both primitives support the `using` keyword for automatic cleanup
- **Reactive-friendly `disabled`** — pass a boolean or `() => signal.value` to integrate with any reactive framework
- **Zero dependencies** — <PackageInfo package="dragit" type="size" /> gzipped, <PackageInfo package="dragit" type="dependencies" /> dependencies

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser runtime with HTML Drag and Drop API support.
- Render targets must be real DOM elements before calling `createDropZone()` or `createSortable()`.
- Provide accessible labels and keyboard alternatives for drag interactions in production UIs.

## See Also

- [Floatit](/floatit/)
- [Craftit](/craftit/)
- [Buildit](/buildit/)
