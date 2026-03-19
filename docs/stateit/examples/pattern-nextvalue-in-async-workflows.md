---
title: 'Stateit Examples — Pattern: `nextValue` in Async Workflows'
description: 'Pattern: `nextValue` in Async Workflows examples for stateit.'
---

## Pattern: `nextValue` in Async Workflows

## Problem

Implement pattern: `nextvalue` in async workflows in a production-friendly way with `@vielzeug/stateit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/stateit` installed.

Use `nextValue` to bridge reactive state into async code without managing subscriptions manually:

```ts
import { store, nextValue } from '@vielzeug/stateit';

const modalStore = store({ open: false, result: null as string | null });

export async function openModal(): Promise<string | null> {
  modalStore.patch({ open: true, result: null });

  // Wait until result is set (modal closed with a value)
  const result = await nextValue(
    modalStore.select((s) => s.result),
    (v) => v !== null,
  );

  modalStore.patch({ open: false });
  return result;
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

- [Framework Integration](./framework-integration.md)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: Shared Module Store](./pattern-shared-module-store.md)
