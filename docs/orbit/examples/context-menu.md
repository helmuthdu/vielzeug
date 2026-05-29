---
title: 'Orbit Examples — Context Menu'
description: 'Context Menu examples for orbit.'
---

## Context Menu

### Problem

A right-click anywhere on a surface should open a context menu pinned to the cursor position. The anchor is not a DOM element — it's a coordinate pair that changes with each click.

### Solution

Right-click context menu pinned to the cursor position using a virtual reference element.

```ts
import { computePosition, flip, shift } from '@vielzeug/orbit';

const menu = document.querySelector<HTMLElement>('#context-menu')!;

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  // Create a zero-size virtual element at the cursor
  const virtualRef = {
    getBoundingClientRect: () => DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
  };

  menu.style.display = 'block';

  const result = computePosition(virtualRef, menu, {
    placement: 'bottom-start',
    middleware: [flip(), shift({ padding: 8 })],
  });

  menu.style.left = `${result.x}px`;
  menu.style.top = `${result.y}px`;
});

document.addEventListener('click', () => {
  menu.style.display = 'none';
});
```

---


### Pitfalls

- The virtual reference element must be updated with the current cursor coordinates before calling `computePosition`. Passing a stale reference positions the menu at the previous click location.
- Context menus triggered by keyboard (`Shift+F10`) have no cursor coordinates. Handle the keyboard case by positioning relative to the focused element using `getBoundingClientRect()`.
- Outside-click detection must use `document.addEventListener('pointerdown', ..., { capture: true })` so it fires before the menu's own click handler.

### Related

- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
- [Popover with Arrow](./popover-with-arrow.md)
