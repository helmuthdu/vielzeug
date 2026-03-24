---
title: 'Floatit Examples — With Craftit Component'
description: 'With Craftit Component examples for floatit.'
---

## With Craftit Component

## Problem

Implement with craftit component in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

Usage inside a [@vielzeug/craftit](/craftit/) component with automatic `autoUpdate` cleanup.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';
import { define, onMount, signal } from '@vielzeug/craftit';

define('my-tooltip', ({ host }) => {
  const visible = signal(false);
  let tooltipEl: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;

  function update() {
    if (!tooltipEl) return;
    positionFloat(host, tooltipEl, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    });
  }

  onMount(() => {
    host.addEventListener('mouseenter', () => {
      visible.value = true;
      cleanup = autoUpdate(host, tooltipEl!, update);
    });
    host.addEventListener('mouseleave', () => {
      visible.value = false;
      cleanup?.();
      cleanup = null;
    });

    // Cleanup is run automatically on unmount by craftit
    return () => cleanup?.();
  });
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
