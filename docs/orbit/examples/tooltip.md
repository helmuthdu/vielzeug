---
title: Tooltip
description: Position a tooltip with a lifecycle-owned Orbit positioner.
---

## Tooltip

### Problem

A tooltip must follow its trigger and stay visible within clipping boundaries.

### Solution

Create a positioner when the tooltip becomes visible; it starts immediately.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

// On hide:
positioner.dispose();
```

### Pitfalls

- Create the positioner only after both elements mount.
- Dispose before removing the floating element.

### Related

- [Popover with Arrow](./popover-with-arrow.md)
- [Orbit Usage Guide](../usage.md)
