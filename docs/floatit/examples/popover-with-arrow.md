---
title: 'Floatit Examples — Popover with Arrow'
description: 'Popover with Arrow examples for floatit.'
---

## Popover with Arrow

## Problem

Implement popover with arrow in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

Align an arrow element with the placement side by using `dataset.placement`.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#btn')!;
const popover = document.querySelector<HTMLElement>('#popover')!;

let cleanup: (() => void) | null = null;

async function update() {
  const placement = await positionFloat(trigger, popover, {
    placement: 'top',
    middleware: [offset(12), flip(), shift({ padding: 8 })],
  });
  popover.dataset.placement = placement;
}

trigger.addEventListener('click', () => {
  if (popover.hasAttribute('data-open')) {
    popover.removeAttribute('data-open');
    cleanup?.();
    cleanup = null;
  } else {
    popover.setAttribute('data-open', '');
    cleanup = autoUpdate(trigger, popover, update);
  }
});
```

```css
/* Arrow pointing down (placement = top) */
#popover[data-placement='top'] .arrow {
  bottom: -5px;
}
#popover[data-placement='bottom'] .arrow {
  top: -5px;
}
#popover[data-placement='left'] .arrow {
  right: -5px;
}
#popover[data-placement='right'] .arrow {
  left: -5px;
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
