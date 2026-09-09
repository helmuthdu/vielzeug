---
title: Dnd — Drag-and-drop primitives for the DOM
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero third-party dependencies.
package: dnd
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [gesture, ore, scroll, refine]
exports: [createDropZone, createSortable, createSortableScope, applyReorder, matchesAccept]
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
import { createDropZone } from '@vielzeug/dnd/drop';
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
| Touch support        | <ore-icon name="check" size="16"></ore-icon> Scoped opt-in | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Zero third-party dependencies | <ore-icon name="check" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Dnd when** an item is picked up and dropped: file drop zones, sortable collections, keyboard reordering, or connected lists.

**Use Gesture instead** when a surface follows free or axis-locked pointer movement and application code owns rendering and completion, such as direct manipulation, swipe reveal, carousel navigation, or drawer dismissal.

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
import { createDropZone } from '@vielzeug/dnd/drop';
import { createSortable } from '@vielzeug/dnd/sortable';

// File drop zone — with async validation and paste support
const dropzone = document.getElementById('dropzone')!;

using zone = createDropZone({
  element: dropzone,
  accept: ['image/*', '.pdf'],
  paste: true,
  onValidate: (files) => files.every((file) => file.size <= 5_000_000),
  onDrop: (files) => console.log('Upload', files),
  onDropRejected: (files) => {
    console.warn(`${files.length} file(s) rejected`);
  },
  onHoverChange: (hovered) => {
    dropzone.classList.toggle('drag-over', hovered);
  },
});

// Sortable list — with application-owned rollback for optimistic updates
let currentOrder = ['a', 'b', 'c'];
const history: Array<{ before: readonly string[] }> = [];

using sortable = createSortable({
  element: document.getElementById('list')!,
  keyboard: true,
  onBeforeReorder: (from, to) => {
    // record positions here before the DOM commits (for FLIP animations)
  },
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ before, after }) => {
    history.push({ before });
    currentOrder = after;
  },
});
```

## Features

<div class="features-grid">

- **Counter-based hover state** — `onHoverChange` stays accurate when dragging over child elements; hover only activates when the drag payload passes the `accept` filter, with symmetric enter/leave pairing to prevent flicker
- **MIME type pre-validation** — queries `dataTransfer.items` during drag to set `dropEffect='none'` before the drop; confirmed against `File.type` on drop
- **Flexible accept patterns** — MIME types (`image/png`), wildcards (`image/*`), and file extensions (`.pdf`)
- **`maxFiles` limit** — cap the number of accepted files per drop; excess files are forwarded to `onDropRejected`
- **`onValidate` async gating** — optional cancellable async step after type filtering; `zone.validating` remains `true` until every pending validation settles
- **Clipboard paste support** — `paste: true` routes pasted files through the same `accept`, `maxFiles`, and `onValidate` pipeline; `onPaste` provides a separate callback; paste rejections are forwarded to `onDropRejected` with the same `(files: File[]) => void` signature as drop rejections
- **`onDropRejected`** — separate callback for files that didn't match `accept`, exceeded `maxFiles`, or were rejected by `onValidate`
- **Sortable lists** — reorders DOM children with a placeholder indicator; fires `onReorder` only when the order actually changes
- **Drag handles** — scope dragging to a child selector via `handle`; whole item is draggable when omitted
- **Custom drag preview** — pass an element or a `(id, item, event) => element | null` factory; control hotspot with `dragImageOffset`
- **`onBeforeReorder` FLIP hook** — fires before commit for both drag and keyboard moves; pair it with [`captureLayout()`](/necromancer/api.md#capturelayout) for lifecycle-owned FLIP animation
- **Application-owned rollback** — `onReorder` emits `{ before, after, item }` so application history can own undo/rollback instead of the drag controller
- **Boundary-safe keyboard reordering** — arrow keys at the first/last item no longer suppress `preventDefault`, so the browser can scroll the page normally
- **Transactional connected scopes** — one `onMove` callback receives each cross-list transfer with both final orders
- **Scoped touch support** — `createSortableScope({ touch: true })` handles only items registered to that scope and uses an inert outline preview
- **Explicit DOM refresh** — call `sortable.refresh()` after DOM mutations, or provide an `items()` provider for explicit item ownership
- **`[Symbol.dispose]`** — both primitives support the `using` keyword for automatic cleanup
- **Reactive-friendly options** — `disabled` is re-read on each event (reassign `options.disabled = true` to toggle); `accept` is normalized and snapshotted at construction; recreate the zone to change accepted types
- **Shared pointer recognition** — touch sorting uses `@vielzeug/gesture`; Dnd retains previews, hit-testing, drag events, and sortable transactions

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Orbit](/orbit/) — floating element positioning; use alongside Dnd to anchor drag previews and drop-zone indicators to precise positions
- [Gesture](/gesture/) — pointer recognition used by Dnd touch sorting and directly by swipe, reveal, carousel, and drawer interactions
- [Ore](/ore/) — web-component authoring framework for application-owned draggable and sortable surfaces
- [Refine](/refine/) — accessible web components; Dnd powers Refine's file-drop input behavior

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
