---
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: dnd
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [ore, scroll, refine]
exports: [createDropZone, createSortable, createSortableScope, applyReorder, matchesAccept]
---

# @vielzeug/dnd

> Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/dnd)](https://www.npmjs.com/package/@vielzeug/dnd) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/dnd` &nbsp;·&nbsp; **Category:** UI Interaction

**Key exports:** `createDropZone`, `createSortable`, `createSortableScope`, `applyReorder`, `matchesAccept`

**When to use:** File drop zones with MIME filtering and async validation, or sortable lists with keyboard, FLIP animation, and optimistic-update support — zero dependencies.

**Related:** [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/scroll](https://vielzeug.dev/scroll/) · [@vielzeug/refine](https://vielzeug.dev/refine/)

</details>

`@vielzeug/dnd` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/dnd
npm install @vielzeug/dnd
yarn add @vielzeug/dnd
```

## Quick Start

```ts
import { createDropZone, createSortable } from '@vielzeug/dnd';

// Drop zone — with async validation and clipboard paste support
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

// Sortable list — with FLIP hook and revert support
using sortable = createSortable({
  element: document.getElementById('list')!,
  keyboard: true,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  onBeforeReorder: (from, to) => {
    // snapshot element positions here for FLIP animations
  },
  onReorder: (ids) => {
    const prev = currentOrder;
    setOrder(ids);
    return () => setOrder(prev); // enable sortable.revert() on server error
  },
});
```

## Documentation

- [Overview](https://vielzeug.dev/dnd/)
- [Usage Guide](https://vielzeug.dev/dnd/usage)
- [API Reference](https://vielzeug.dev/dnd/api)
- [Examples](https://vielzeug.dev/dnd/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
