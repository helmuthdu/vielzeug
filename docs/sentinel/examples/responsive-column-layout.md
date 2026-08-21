---
title: 'Sentinel Examples — Responsive Column Layout'
description: Set grid columns from a container's measured content-box width.
---

## Responsive Column Layout

### Problem

A grid needs to respond to its own width rather than the viewport. `createElementSize()` exposes content-box dimensions after the first ResizeObserver delivery.

### Solution

Create the grid, observe it, and update its columns when the measured width changes.

```ts
import { createElementSize, SentinelUnavailableError } from '@vielzeug/sentinel';

const grid = document.createElement('section');
grid.style.display = 'grid';
grid.style.gap = '1rem';
grid.textContent = 'Resize the viewport to change this grid';
document.body.append(grid);

function observeGrid(): () => void {
  try {
    const size = createElementSize(grid);
    const render = () => {
      const width = size.value?.width;
      if (width === undefined) return;
      const columns = width < 400 ? 1 : width < 800 ? 2 : 3;
      grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    };

    const unsubscribe = size.subscribe(render);
    return () => {
      unsubscribe();
      size.dispose();
    };
  } catch (error) {
    if (!(error instanceof SentinelUnavailableError)) throw error;
    return () => {};
  }
}

const stopObserving = observeGrid();
// Call stopObserving() when this grid is removed.
```

### Pitfalls

- Handle the initial `null` state before the first measurement.
- Prefer native CSS container queries when JavaScript does not need the size.
- Avoid expensive layout reads inside the subscription listener.

### Related

- [Element Size API](../api.md#createelementsize)
- [Responsive Viewport Tracking](./responsive-viewport-tracking.md)
