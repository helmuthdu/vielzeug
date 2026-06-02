---
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: grip
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [craft, scroll, sigil]
exports: [createDropZone, createSortable, createSortableScope, applyReorder, matchesAccept]
---

# /grip

> Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/grip)](https://www.npmjs.com/package/@vielzeug/grip) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/grip` &nbsp;·&nbsp; **Category:** Ui-interaction

**Key exports:** `createDropZone`, `createSortable`, `createSortableScope`, `applyReorder`, `matchesAccept`

**When to use:** File drop zones with MIME filtering and async validation, or sortable lists with keyboard, FLIP animation, and optimistic-update support — zero dependencies.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/scroll](https://vielzeug.dev/scroll/) · [@vielzeug/sigil](https://vielzeug.dev/sigil/)

</details>

`/grip` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /grip
npm install /grip
yarn add /grip
```

## Quick Start

```ts
import { createDropZone, createSortable } from '/grip';

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

- [Overview](https://vielzeug.dev/grip/)
- [Usage Guide](https://vielzeug.dev/grip/usage)
- [API Reference](https://vielzeug.dev/grip/api)
- [Examples](https://vielzeug.dev/grip/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
