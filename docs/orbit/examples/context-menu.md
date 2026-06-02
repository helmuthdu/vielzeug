---
title: 'Orbit Examples — Context Menu'
description: 'Context Menu example for @vielzeug/orbit.'
---

## Context Menu

### Problem

A right-click anywhere on a surface should open a context menu pinned to the cursor position. The anchor is not a DOM element — it is a coordinate pair that changes with each click.

### Solution

Right-click context menu pinned to the cursor position using a virtual reference element.

```ts
import { computePosition } from '@vielzeug/orbit';
import { presets } from '@vielzeug/orbit/presets';

const menu = document.querySelector<HTMLElement>('#context-menu')!;

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const virtualRef = {
    getBoundingClientRect: () =>
      DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
  };

  menu.style.display = 'block';

  const { x, y } = computePosition(virtualRef, menu, presets.contextMenu());

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
});

document.addEventListener('pointerdown', (e) => {
  if (!menu.contains(e.target as Node)) {
    menu.style.display = 'none';
  }
}, { capture: true });
```

---

### Pitfalls

- The virtual reference must be created fresh with the current coordinates on each `contextmenu` event. A stale reference positions the menu at the previous click location.
- Context menus triggered by keyboard (`Shift+F10`) have no cursor coordinates. Handle the keyboard case by positioning relative to the focused element using `getBoundingClientRect()`.
- Outside-click detection should use `pointerdown` in the capture phase (`{ capture: true }`) so it fires before the menu's own click handlers.

### Related

- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
- [Popover with Arrow](./popover-with-arrow.md)
