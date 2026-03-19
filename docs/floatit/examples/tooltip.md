---
title: 'Floatit Examples — Tooltip'
description: 'Tooltip examples for floatit.'
---

## Tooltip

## Problem

Implement tooltip in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

A popover-based tooltip that flips and shifts to stay visible.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

let cleanup: (() => void) | null = null;

function show() {
  tooltip.showPopover();
  cleanup = autoUpdate(trigger, tooltip, () =>
    positionFloat(trigger, tooltip, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    }).then((p) => {
      tooltip.dataset.placement = p;
    }),
  );
}

function hide() {
  tooltip.hidePopover();
  cleanup?.();
  cleanup = null;
}

trigger.addEventListener('mouseenter', show);
trigger.addEventListener('mouseleave', hide);
trigger.addEventListener('focusin', show);
trigger.addEventListener('focusout', hide);
```

```css
#tooltip {
  position: fixed;
  inset: unset;
  margin: 0;
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

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
