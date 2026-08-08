---
title: Dropdown Select
description: Position an absolute dropdown with @vielzeug/orbit.
---

## Dropdown Select

### Problem

A dropdown inside a positioned container needs container-relative coordinates and collision handling.

### Solution

Use `strategy: 'absolute'` with flip, shift, and size middleware.

```ts
import { createPositioner, flip, offset, shift, size } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, dropdown, {
  middleware: [offset(4), flip(), shift({ padding: 6 }), size({ padding: 6 })],
  placement: 'bottom-start',
  strategy: 'absolute',
});

positioner.start();
```

### Pitfalls

- The dropdown must have an offset parent for absolute strategy.
- Dispose positioner when the dropdown closes.

### Related

- [Context Menu](./context-menu.md)
- [Orbit Usage Guide](../usage.md)
