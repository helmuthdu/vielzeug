---
title: 'Virtualit Examples — Recreate on Remount'
description: 'Recreate on remount examples for virtualit.'
---

## Recreate on Remount

## Problem

Implement remount-safe virtualization in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Useful when a component recreates its scroll container (for example, dropdown reopen or portal remount).

```ts
import { createVirtualizer, type Virtualizer } from '@vielzeug/virtualit';

let virt: Virtualizer | null = null;

// Attach once the component mounts
function onMount(scrollEl: HTMLElement) {
  virt = createVirtualizer(scrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: render,
  });
}

// Recreate for a new container
function onReopen(newScrollEl: HTMLElement) {
  virt?.destroy();
  virt = createVirtualizer(newScrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: render,
  });
}

function onDestroy() {
  virt?.destroy();
}
```

---

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
