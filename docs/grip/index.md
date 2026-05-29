---
title: Grip — Drag-and-drop primitives for the DOM
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: grip
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [craft, scroll, block]
exports: [createDropZone, createSortable, createSortableScope, applyReorder]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="grip" />

<img src="/logo-grip.svg" alt="Grip logo" width="156" class="logo-highlight"/>

# Grip

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/grip` &nbsp;·&nbsp; **Category:** Ui Interaction

**Key exports:** `createDropZone`, `createSortable`, `createSortableScope`, `applyReorder`

**When to use:** File drop zones with MIME filtering, or sortable lists with keyboard and mouse support. Zero dependencies.

**Related:** [Craft](/craft/) · [Scroll](/scroll/) · [Block](/block/)

</details>

`@vielzeug/grip` is a zero-dependency drag-and-drop library for the Document Object Model (DOM). It provides two focused primitives: a drop zone for file drag-and-drop with MIME type filtering and a sortable list for reordering elements. Both wrap the HTML Drag and Drop API with reliable hover state, full lifecycle management, and `using` keyword support.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/grip
```

```sh [npm]
npm install @vielzeug/grip
```

```sh [yarn]
yarn add @vielzeug/grip
```

:::

## Quick Start

```ts
import { createDropZone, createSortable } from '@vielzeug/grip';

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

## Why Grip?

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

// After — Grip
import { createDropZone } from '@vielzeug/grip';
const zone = createDropZone({
  element: dropzone,
  accept: ['image/*'],
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => showError(`${files.length} file(s) not accepted`),
  onHoverChange: (hovered) => dropzone.classList.toggle('over', hovered),
});
```

| Feature             | Grip                                       | SortableJS | dnd-kit |
| ------------------- | -------------------------------------------- | ---------- | ------- |
| Bundle size         | <PackageInfo package="grip" type="size" /> | ~15 kB     | ~30 kB  |
| Framework agnostic  | ✅                                           | ✅         | ✅      |
| MIME type filtering | ✅ Pre-validated                             | ❌         | ❌      |
| Counter-based hover | ✅                                           | ❌         | N/A     |
| Sortable lists      | ✅                                           | ✅         | ✅      |
| Drag handles        | ✅                                           | ✅         | ✅      |
| `using` support     | ✅                                           | ❌         | ❌      |
| Zero dependencies   | ✅                                           | ✅         | ❌      |

**Use Grip when** you need reliable file drop zones with MIME filtering or sortable lists in a framework-agnostic environment.

**Consider dnd-kit** if you are building a React app and need complex multi-container drag interactions or accessibility-first sortable trees.

## Features

- **Counter-based hover state** — `onHoverChange` stays accurate when dragging over child elements; hover only activates when the drag payload passes the `accept` filter, with symmetric enter/leave pairing to prevent flicker
- **MIME type pre-validation** — queries `dataTransfer.items` during drag to set `dropEffect='none'` before the drop; confirmed against `File.type` on drop
- **Flexible accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and file extensions (`.pdf`)
- **`maxFiles` limit** — cap the number of accepted files per drop; excess files are forwarded to `onDropRejected`
- **`onDropRejected`** — separate callback for files that didn't match `accept` or exceeded `maxFiles`; enables rejection UX without extra filtering logic
- **Sortable lists** — reorders DOM children with a placeholder indicator; fires `onReorder` only when the order actually changes
- **Drag handles** — scope dragging to a child selector via `handle`; whole item is draggable when omitted
- **Custom drag preview** — pass an element or a `(id, item, event) => element | null` factory; control hotspot with `dragImageOffset`
- **Explicit connected scopes** — lists only exchange items when they share a `createSortableScope()` instance
- **Explicit DOM sync** — call `sortable.sync()` after DOM mutations instead of relying on hidden observers
- **`[Symbol.dispose]`** — both primitives support the `using` keyword for automatic cleanup
- **Reactive-friendly options** — pass booleans/arrays or getter functions for `disabled` and `accept`
- **Zero dependencies** — <PackageInfo package="grip" type="size" /> gzipped, <PackageInfo package="grip" type="dependencies" /> dependencies

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

### Prerequisites

- Browser runtime with HTML Drag and Drop API support.
- Render targets must be real DOM elements before calling `createDropZone()` or `createSortable()`.
- Provide accessible labels and keyboard alternatives for drag interactions in production UIs.

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Orbit](/orbit/)
- [Craft](/craft/)
- [Block](/block/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
