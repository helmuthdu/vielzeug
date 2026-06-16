---
title: 'Scroll Examples — Recreate on Remount'
description: 'Recreate on remount examples for scroll.'
---

## Recreate on Remount

### Problem

The scroll container is recreated at runtime — for example, when a dropdown reopens or a portal remounts. The virtualizer from the previous mount is stale and must be replaced with a fresh instance.

### Solution

Useful when a component recreates its scroll container (for example, dropdown reopen or portal remount).

```ts
import { createVirtualizer, type Virtualizer } from '@vielzeug/scroll';

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
  virt?.dispose();
  virt = createVirtualizer(newScrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: render,
  });
}

function onDestroy() {
  virt?.dispose();
}
```

---

### Pitfalls

- The old virtualizer must be destroyed before creating a new one for the same container. Two concurrent instances both write `style.height` on the list element, causing a conflict.
- Recreating inside a `ResizeObserver` fires on every size change. Guard with a destroyed flag so the observer does not recreate the virtualizer after explicit teardown.
- The new instance's `scroll` listener must be registered on the fresh container element, not a stale reference captured before the container was recreated.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
