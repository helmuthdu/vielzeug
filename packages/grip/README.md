---
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: grip
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [craft, scroll, sigil]
exports: [createDropZone, createSortable, createSortableScope, applyReorder]
---

# /grip

> Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/grip)](https://www.npmjs.com/package/@vielzeug/grip) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/grip` &nbsp;·&nbsp; **Category:** Ui-interaction

**Key exports:** `createDropZone`, `createSortable`

**When to use:** Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

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
  keyboard: true,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  dragImage: (id, item) => item,
  dragImageOffset: [8, 8],
  onReorder: (ids) => {
    saveOrder(ids);
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
