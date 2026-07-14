---
title: Dnd — Drag-and-drop primitives for the DOM
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: dnd
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [ore, scroll, refine]
exports: [createDropZone, createSortable, createSortableScope, createTouchDragShim, applyReorder, matchesAccept]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="dnd" />

## Why Dnd?

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

// After — Dnd
import { createDropZone } from '@vielzeug/dnd';
const zone = createDropZone({
  element: dropzone,
  accept: ['image/*'],
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => showError(`${files.length} file(s) not accepted`),
  onHoverChange: (hovered) => dropzone.classList.toggle('over', hovered),
});
```

| Feature             | DND                                                      | SortableJS                                 | dnd-kit                                    |
| ------------------- | -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size         | <PackageInfo package="dnd" type="size" />                | ~15 kB                                     | ~30 kB                                     |
| Framework agnostic  | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| MIME type filtering | <ore-icon name="check" size="16"></ore-icon> Pre-validated | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Counter-based hover | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="x" size="16"></ore-icon>     | N/A                                        |
| Sortable lists      | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Drag handles        | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| `using` support     | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Touch support        | <ore-icon name="check" size="16"></ore-icon> Opt-in shim  | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Zero dependencies   | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Dnd when** you need reliable file drop zones with MIME filtering or sortable lists in a framework-agnostic environment.

**Consider dnd-kit** if you are building a React app and need complex multi-container drag interactions or accessibility-first sortable trees.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/dnd
```

```sh [npm]
npm install @vielzeug/dnd
```

```sh [yarn]
yarn add @vielzeug/dnd
```

:::

## Quick Start

```ts
import { createDropZone, createSortable } from '@vielzeug/dnd';

// File drop zone — with async validation and paste support
using zone = createDropZone({
  element: document.getElementById('dropzone')!,
  accept: ['image/*', '.pdf'],
  paste: true,
  onValidate: async (files) => checkServerQuota(files),
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => {
    showError(`${files.length} file(s) not accepted`);
  },
  onHoverChange: (hovered) => {
    document.getElementById('dropzone')!.classList.toggle('drag-over', hovered);
  },
});

// Sortable list — with revert support for optimistic updates
using sortable = createSortable({
  element: document.getElementById('list')!,
  keyboard: true,
  onBeforeReorder: (from, to) => {
    // record positions here before the DOM commits (for FLIP animations)
  },
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids, setRevert }) => {
    const prev = currentOrder;
    setOrder(ids);
    setRevert(() => setOrder(prev)); // enable sortable.revert() on failure
  },
});
```

## Features

<div class="features-grid">

- **Counter-based hover state** — `onHoverChange` stays accurate when dragging over child elements; hover only activates when the drag payload passes the `accept` filter, with symmetric enter/leave pairing to prevent flicker
- **MIME type pre-validation** — queries `dataTransfer.items` during drag to set `dropEffect='none'` before the drop; confirmed against `File.type` on drop
- **Flexible accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and file extensions (`.pdf`)
- **`maxFiles` limit** — cap the number of accepted files per drop; excess files are forwarded to `onDropRejected`
- **`onValidate` async gating** — optional async step after type filtering; `zone.validating` is `true` while a promise is pending; only receives type-accepted files
- **Clipboard paste support** — `paste: true` routes pasted files through the same `accept`, `maxFiles`, and `onValidate` pipeline; `onPaste` provides a separate callback; paste rejections are forwarded to `onDropRejected` with the same `(files: File[]) => void` signature as drop rejections
- **`onDropRejected`** — separate callback for files that didn't match `accept`, exceeded `maxFiles`, or were rejected by `onValidate`; event type reflects whether the rejection came from a drop or a paste
- **Sortable lists** — reorders DOM children with a placeholder indicator; fires `onReorder` only when the order actually changes
- **Drag handles** — scope dragging to a child selector via `handle`; whole item is draggable when omitted
- **Custom drag preview** — pass an element or a `(id, item, event) => element | null` factory; control hotspot with `dragImageOffset`
- **`onBeforeReorder` FLIP hook** — fires before commit for both drag and keyboard moves; items are still in pre-commit positions, making it ideal for FLIP animation setup
- **`sortable.revert()`** — register a revert function via `event.setRevert(fn)` inside `onReorder`; `sortable.revert()` invokes it and clears it for rolling back optimistic updates on server failure
- **Boundary-safe keyboard reordering** — arrow keys at the first/last item no longer suppress `preventDefault`, so the browser can scroll the page normally
- **Explicit connected scopes** — lists only exchange items when they share a `createSortableScope()` instance
- **Touch support via `createTouchDragShim()`** — bridges `touchstart`/`touchmove`/`touchend`/`touchcancel` into the same synthetic `DragEvent` sequence `createSortable`/`createDropZone` already listen for; one `document`-level instance covers the whole app
- **Explicit DOM sync** — call `sortable.sync()` after DOM mutations instead of relying on hidden observers
- **`[Symbol.dispose]`** — both primitives support the `using` keyword for automatic cleanup
- **Reactive-friendly options** — `disabled` is re-read on each event (reassign `options.disabled = true` to toggle); `accept` captures the array reference, so push/splice mutations are reflected without recreating the zone
- **Zero dependencies** — <PackageInfo package="dnd" type="size" /> gzipped, <PackageInfo package="dnd" type="dependencies" /> dependencies

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Orbit](/orbit/) — floating element positioning; use alongside Dnd to anchor drag previews and drop-zone indicators to precise positions
- [Ore](/ore/) — web-component authoring framework; build draggable custom elements with Dnd's pointer event primitives
- [Refine](/refine/) — accessible web components; Dnd powers the drag-and-drop inside Refine's sortable list and kanban components

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
