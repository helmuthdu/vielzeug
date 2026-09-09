# @vielzeug/dnd

> Drag-and-drop — drop zones and sortable lists

## Installation

```sh
pnpm add @vielzeug/dnd
npm install @vielzeug/dnd
yarn add @vielzeug/dnd
```

## Quick Start

```ts
import { createDropZone } from '@vielzeug/dnd/drop';
import { createSortable, createSortableScope } from '@vielzeug/dnd/sortable';

// Drop zone — with async validation and clipboard paste support
using zone = createDropZone({
  element: document.getElementById('dropzone')!,
  accept: ['image/*', '.pdf'],
  paste: true,
  onValidate: async (files, { signal }) => checkServerQuota(files, { signal }),
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => {
    showError(`${files.length} file(s) not accepted`);
  },
  onHoverChange: (hovered) => {
    document.getElementById('dropzone')!.classList.toggle('drag-over', hovered);
  },
});

// Connected sortable lists — one scope owns cross-list moves and touch input
using scope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => saveMove(itemId, sourceIds, targetIds),
  touch: true,
});
using sortable = createSortable({
  element: document.getElementById('list')!,
  getKey: (el) => el.dataset.sortId!,
  onBeforeReorder: (from, to) => {
    // snapshot element positions here for FLIP animations
  },
  onReorder: ({ after }) => {
    setOrder(after);
  },
  scope,
});
```

## Documentation

- [Overview](https://vielzeug.dev/dnd/)
- [Usage Guide](https://vielzeug.dev/dnd/usage)
- [API Reference](https://vielzeug.dev/dnd/api)
- [Examples](https://vielzeug.dev/dnd/examples)
- [Migration Guide](https://vielzeug.dev/dnd/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
