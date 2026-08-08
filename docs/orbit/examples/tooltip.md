---
title: Tooltip
description: Position a tooltip with a lifecycle-owned Orbit positioner.
---

## Tooltip

### Problem

A tooltip must follow its trigger and stay visible within clipping boundaries.

### Solution

Create and start a positioner when the tooltip becomes visible.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
// On hide:
positioner.dispose();
```

### Pitfalls

- Start only after both elements mount.
- Dispose before removing the floating element.

### Related

- [Popover with Arrow](./popover-with-arrow.md)
- [Orbit Usage Guide](../usage.md)
