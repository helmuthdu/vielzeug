---
title: 'Virtualit Examples — Using `Virtualizer` Directly (Without `createVirtualizer`)'
description: 'Using `Virtualizer` Directly (Without `createVirtualizer`) examples for virtualit.'
---

## Using `Virtualizer` Directly (Without `createVirtualizer`)

## Problem

Implement using `virtualizer` directly (without `createvirtualizer`) in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Useful in component frameworks where the scroll container is not available at construction time.

```ts
import { Virtualizer } from '@vielzeug/virtualit';

// Build the instance when data is ready — no element needed yet
const virt = new Virtualizer({
  count: rows.length,
  estimateSize: 36,
  onChange: render,
});

// Attach once the component mounts
function onMount(scrollEl: HTMLElement) {
  virt.attach(scrollEl);
}

// The virtualizer can be re-attached to a new container
function onReopen(newScrollEl: HTMLElement) {
  virt.count = rows.length; // sync count before re-attaching
  virt.attach(newScrollEl);
}

function onDestroy() {
  virt.destroy();
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
