---
title: 'Floatit Examples — Context Menu'
description: 'Context Menu examples for floatit.'
---

## Context Menu

## Problem

Implement context menu in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

Right-click context menu pinned to the cursor position using a virtual reference element.

```ts
import { flip, positionFloat, shift } from '@vielzeug/floatit';

const menu = document.querySelector<HTMLElement>('#context-menu')!;

document.addEventListener('contextmenu', async (e) => {
  e.preventDefault();

  // Create a zero-size virtual element at the cursor
  const virtualRef = {
    getBoundingClientRect: () => DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
  };

  menu.style.display = 'block';

  await positionFloat(virtualRef as Element, menu, {
    placement: 'bottom-start',
    middleware: [flip(), shift({ padding: 8 })],
  });
});

document.addEventListener('click', () => {
  menu.style.display = 'none';
});
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

- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
- [Popover with Arrow](./popover-with-arrow.md)
