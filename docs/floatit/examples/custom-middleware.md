---
title: 'Floatit Examples — Custom Middleware'
description: 'Custom Middleware examples for floatit.'
---

## Custom Middleware

## Problem

Implement custom middleware in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

Snap the floating element to the nearest 4px grid.

```ts
import { positionFloat, flip, offset, type Middleware } from '@vielzeug/floatit';

const snap = (grid: number): Middleware => ({
  name: 'snap',
  fn: (state) => ({
    ...state,
    x: Math.round(state.x / grid) * grid,
    y: Math.round(state.y / grid) * grid,
  }),
});

positionFloat(trigger, floating, {
  placement: 'bottom',
  middleware: [offset(8), flip(), snap(4)],
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

- [Context Menu](./context-menu.md)
- [Dropdown / Select](./dropdown-select.md)
- [Popover with Arrow](./popover-with-arrow.md)
