---
title: 'Orbit Examples — Popover with Arrow'
description: 'Popover with arrow example for @vielzeug/orbit.'
---

## Popover with Arrow

### Problem

A popover needs a visible arrow element pointing back to its trigger. The arrow position changes as the popover flips sides or shifts to stay within the viewport. The reference must also be tracked so the popover hides when it scrolls out of view.

### Solution

Use `arrow()` after `flip()` and `shift()` to place the arrow against the final computed position, and `hide()` to track reference visibility.

```ts
import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@vielzeug/orbit';
import type { ArrowData, HideData } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#btn')!;
const popover = document.querySelector<HTMLElement>('#popover')!;
const arrowEl = popover.querySelector<HTMLElement>('.arrow')!;

let cleanup: (() => void) | null = null;

function update() {
  const { x, y, placement, middlewareData } = computePosition(trigger, popover, {
    placement: 'top',
    middleware: [offset(12), flip(), shift({ padding: 8 }), arrow({ element: arrowEl, padding: 8 }), hide()],
  });

  popover.style.left = `${x}px`;
  popover.style.top = `${y}px`;
  popover.dataset.placement = placement;

  const { x: ax, y: ay } = middlewareData.arrow as ArrowData;
  arrowEl.style.left = ax != null ? `${ax}px` : '';
  arrowEl.style.top = ay != null ? `${ay}px` : '';

  const { referenceHidden } = middlewareData.hide as HideData;
  popover.style.visibility = referenceHidden ? 'hidden' : 'visible';
}

trigger.addEventListener('click', () => {
  if (popover.hasAttribute('data-open')) {
    popover.removeAttribute('data-open');
    cleanup?.();
    cleanup = null;
    return;
  }

  popover.setAttribute('data-open', '');
  cleanup = autoUpdate(trigger, popover, update);
});
```

```css
#popover .arrow {
  position: absolute;
}

#popover[data-placement^='top'] .arrow {
  bottom: -5px;
}

#popover[data-placement^='bottom'] .arrow {
  top: -5px;
}

#popover[data-placement^='left'] .arrow {
  right: -5px;
}

#popover[data-placement^='right'] .arrow {
  left: -5px;
}
```

### Pitfalls

- `arrow()` must come after `flip()` and `shift()` in the pipeline. Placing it earlier means the arrow is positioned relative to the initial placement, not the final one.
- `middlewareData.arrow` is `undefined` before the first `computePosition` call. Destructure with a fallback when applying styles imperatively before the first update.
- The `centerOffset` field of `ArrowData` is non-zero when the popover is too small to center the arrow on the reference. Use it to nudge the arrow visually toward the correct edge.

### Related

- [Tooltip](./tooltip.md)
- [Dropdown Select](./dropdown-select.md)
- [Using Presets](./using-presets.md)
