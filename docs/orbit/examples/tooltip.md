---
title: 'Orbit Examples — Tooltip'
description: 'Tooltip example for @vielzeug/orbit.'
---

## Tooltip

### Problem

A tooltip must appear near its trigger on hover, stay within the viewport by flipping or shifting, and be removed cleanly when the user leaves — without leaking `autoUpdate` listeners.

### Solution

A popover-based tooltip that flips and shifts to stay visible.

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

let cleanup: (() => void) | null = null;

function show() {
  tooltip.showPopover();
  cleanup = float(trigger, tooltip, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
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


### Pitfalls

- `autoUpdate` registers scroll and resize listeners globally. Not calling its returned cleanup function leaks these listeners even after the tooltip is hidden.
- A tooltip that appears on `:focus` must also disappear on `blur`. Listening only to `mouseenter`/`mouseleave` leaves the tooltip open for keyboard users until they interact with something else.
- The `shift` middleware prevents viewport overflow but does not flip. Combine with `flip` if you want the tooltip to move to the opposite side rather than shift along the same axis.

### Related

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
