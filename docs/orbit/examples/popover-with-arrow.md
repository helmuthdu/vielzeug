---
title: Popover with Arrow
description: Position a popover and align its arrow with @vielzeug/orbit.
---

## Popover with Arrow

### Problem

A popover arrow must follow final placement after flip and shift middleware run.

### Solution

Apply arrow coordinates from positioner middleware data.

```ts
import { arrow, createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, popover, {
  apply(result) {
    const arrowData = result.middlewareData.arrow as { x?: number; y?: number } | undefined;

    arrowElement.style.left = arrowData?.x == null ? '' : `${arrowData.x}px`;
    arrowElement.style.top = arrowData?.y == null ? '' : `${arrowData.y}px`;
  },
  middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowElement })],
});

positioner.start();
```

### Pitfalls

- Put arrow middleware after placement-changing middleware.
- Dispose positioner with popover owner.

### Related

- [Tooltip](./tooltip.md)
- [Orbit Usage Guide](../usage.md)
