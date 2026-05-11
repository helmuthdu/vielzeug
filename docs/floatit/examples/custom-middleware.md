---
title: 'Floatit Examples — Custom Middleware'
description: 'Custom Middleware examples for floatit.'
---

## Custom Middleware

## Runnable Example

```ts
import { flip, offset, positionFloat, type Middleware } from '@vielzeug/floatit';

const snap = (grid: number): Middleware => ({ x, y }) => ({
  data: { snap: { grid } },
  x: Math.round(x / grid) * grid,
  y: Math.round(y / grid) * grid,
});

const result = positionFloat(trigger, floating, {
  placement: 'bottom',
  middleware: [offset(8), flip(), snap(4)],
});

console.log(result.middlewareData.snap);
```
