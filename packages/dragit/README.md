---
description: Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.
package: dragit
category: ui-interaction
keywords: [drag-drop, sortable, file-upload, drop-zone, dnd, reorder]
related: [craftit, virtualit, buildit]
exports: [createDropZone, createSortable]
---

# @vielzeug/dragit

> Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/dragit)](https://www.npmjs.com/package/@vielzeug/dragit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/dragit` &nbsp;·&nbsp; **Category:** Ui-interaction

**Key exports:** `createDropZone`, `createSortable`

**When to use:** Framework-agnostic drag-and-drop. Drop zones with MIME filtering, sortable lists with drag handles, and explicit connected scopes — zero dependencies.

**Related:** [@vielzeug/craftit](https://vielzeug.dev/craftit/) · [@vielzeug/virtualit](https://vielzeug.dev/virtualit/) · [@vielzeug/buildit](https://vielzeug.dev/buildit/)

</details>

`@vielzeug/dragit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/dragit
npm install @vielzeug/dragit
yarn add @vielzeug/dragit
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
  keyboard: true,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  dragImage: (id, item) => item,
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

## Documentation

- [Overview](https://vielzeug.dev/dragit/)
- [Usage Guide](https://vielzeug.dev/dragit/usage)
- [API Reference](https://vielzeug.dev/dragit/api)
- [Examples](https://vielzeug.dev/dragit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
