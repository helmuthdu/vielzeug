---
title: 'Grip Examples — Using `using` for scoped cleanup'
description: 'Using `using` for scoped cleanup example for @vielzeug/grip.'
---

## Using `using` for scoped cleanup

### Problem

You set up drag-and-drop inside a function or block scope and want the cleanup to happen automatically when the block exits — without a try/finally or manual `dispose()` call.

### Solution

Both primitives implement `[Symbol.dispose]`, so they work with the `using` keyword in any block scope, including `try` blocks and async functions:

```ts
import { createDropZone, createSortable } from '@vielzeug/grip';

async function setupPage() {
  using zone = createDropZone({
    element: document.getElementById('dropzone')!,
    onDrop: handleFiles,
  });

  using sortable = createSortable({
    element: document.getElementById('list')!,
    onReorder: saveOrder,
  });

  await pageReady();

  // Both zone and sortable are still active here
  // They are destroyed automatically when setupPage() returns or throws
}
```


### Pitfalls

- `using` requires TypeScript 5.2+ and a `tsconfig.json` `target` of `es2022` or later. Without this, `[Symbol.dispose]` is `undefined` at runtime.
- `using` calls `[Symbol.dispose]` on scope exit, not on `return`. If you return the value before the block exits, cleanup is still deferred until the scope ends.
- `await using` requires `[Symbol.asyncDispose]`. The synchronous `using` keyword calls `[Symbol.dispose]` synchronously — avoid it if cleanup involves async operations that must complete before proceeding.

### Related

- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
