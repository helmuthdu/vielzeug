---
title: 'Dragit Examples — Using `using` for scoped cleanup'
description: 'Using `using` for scoped cleanup examples for dragit.'
---

## Using `using` for scoped cleanup

## Problem

Implement using `using` for scoped cleanup in a production-friendly way with `@vielzeug/dragit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/dragit` installed.

Both primitives implement `[Symbol.dispose]`, so they work with the `using` keyword in any block scope, including `try` blocks and async functions:

```ts
import { createDropZone, createSortable } from '@vielzeug/dragit';

async function setupPage() {
  using zone = createDropZone({
    element: document.getElementById('dropzone')!,
    onDrop: handleFiles,
  });

  using sortable = createSortable({
    container: document.getElementById('list')!,
    onReorder: saveOrder,
  });

  await pageReady();

  // Both zone and sortable are still active here
  // They are destroyed automatically when setupPage() returns or throws
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](./framework-integration.md)
