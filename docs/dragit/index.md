---
title: Dragit — Drag-and-drop primitives for the DOM
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles — zero dependencies.
---

<PackageBadges package="dragit" />

<img src="/logo-dragit.svg" alt="Dragit Logo" width="156" class="logo-highlight"/>

# Dragit

**Dragit** is a zero-dependency drag-and-drop library for the DOM. It provides two focused primitives: a drop zone for file drag-and-drop with MIME filtering, and a sortable list for reordering DOM elements via drag. Both wrap the HTML Drag & Drop API with reliable hover state, full lifecycle management, and `using`-keyword support.

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
  container: document.getElementById('list')!,
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

## Features

- **Counter-based hover state** — `onHoverChange` stays accurate when dragging over child elements; no spurious leave/enter flicker
- **MIME type pre-validation** — queries `dataTransfer.items` during drag to set `dropEffect='none'` before the drop; confirmed against `File.type` on drop
- **Flexible accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and file extensions (`.pdf`)
- **`onDropRejected`** — separate callback for files that didn't match `accept`; enables rejection UX without extra filtering logic
- **Sortable lists** — reorders DOM children with a placeholder indicator; fires `onReorder` only when the order actually changes
- **Drag handles** — scope dragging to a child selector via `handle`; whole item is draggable when omitted
- **`sortable.refresh()`** — re-syncs `draggable` and `role` attributes after adding or removing list items
- **`[Symbol.dispose]`** — both primitives support the `using` keyword for automatic cleanup
- **Reactive-friendly `disabled`** — pass `() => signal.value` to integrate with any reactive framework
- **Zero dependencies** — <PackageInfo package="dragit" type="size" /> gzipped, <PackageInfo package="dragit" type="dependencies" /> dependencies

## Next Steps

|                           |                                                                   |
| ------------------------- | ----------------------------------------------------------------- |
| [Usage Guide](./usage.md) | Drop zones, sortable lists, accept patterns, styling, and cleanup |
| [API Reference](./api.md) | Complete type signatures and option documentation                 |
| [Examples](./examples.md) | Framework integration and real-world patterns                     |
