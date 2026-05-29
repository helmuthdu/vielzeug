---
title: 'Orbit Examples — Custom Middleware'
description: 'Custom middleware example for @vielzeug/orbit.'
---

## Custom Middleware

### Problem

You need positioning behaviour that the built-in middleware does not cover — for example, snapping coordinates to a CSS grid. Custom middleware lets you intercept the positioning pipeline, read the current state, and return adjusted coordinates or extra data.

### Solution

Use the `Middleware` type to write a pure function that receives `MiddlewareState` and returns partial updates.

```ts
import { computePosition, flip, offset, type Middleware } from '@vielzeug/orbit';

const snap =
  (grid: number): Middleware =>
  ({ x, y }) => ({
    data: { snap: { grid } },
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  });

const { x, y, middlewareData } = computePosition(trigger, floating, {
  placement: 'bottom',
  middleware: [offset(8), flip(), snap(4)],
});

floating.style.left = `${x}px`;
floating.style.top = `${y}px`;
// middlewareData.snap → { grid: 4 }
```

### Pitfalls

- Custom middleware runs after built-in middleware in declaration order. Returning `reset: true` restarts the full pipeline — use this only when the middleware must react to another middleware's result, and guard against infinite loops with a `middlewareData` flag.
- Return `undefined` (or nothing) when you make no change. Returning `{ x, y }` with the original values is valid but redundant and slightly less efficient.
- Middleware share `middlewareData` through the `data` return field. Use a unique namespace key (e.g., your middleware's name) to avoid collisions with built-ins.

### Related

- [Tooltip](./tooltip.md)
- [Popover with Arrow](./popover-with-arrow.md)
- [Using Presets](./using-presets.md)
