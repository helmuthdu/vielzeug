---
title: 'Virtualit Examples — Explicit Resource Management (`using`)'
description: 'Explicit Resource Management (`using`) examples for virtualit.'
---

## Explicit Resource Management (`using`)

## Problem

Implement explicit resource management (`using`) in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

function renderList(scrollEl: HTMLElement, rows: string[]) {
  using virt = createVirtualizer(scrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: (virtualItems, totalSize) => {
      // render...
    },
  });

  // ... synchronous setup ...
} // virt.destroy() is called automatically here
```

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
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
