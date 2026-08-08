---
title: Context Menu
description: Anchor a context menu to pointer coordinates with @vielzeug/orbit.
---

## Context Menu

### Problem

A context menu needs positioning from pointer coordinates rather than a DOM trigger.

### Solution

Use a virtual reference and start a positioner after rendering the menu.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();

  const reference = {
    getBoundingClientRect: () => ({ height: 0, width: 0, x: event.clientX, y: event.clientY }),
  };
  const positioner = createPositioner(reference, menu, {
    middleware: [offset(2), flip(), shift({ padding: 8 })],
    placement: 'bottom-start',
  });

  positioner.start();
});
```

### Pitfalls

- Dispose prior menu positioner before opening another menu.
- Keep menu lifecycle separate from virtual-reference creation.

### Related

- [Dropdown Select](./dropdown-select.md)
- [Orbit Usage Guide](../usage.md)
