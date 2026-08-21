---
title: 'Sentinel Examples — Responsive Viewport Tracking'
description: Update a layout marker when the viewport crosses responsive breakpoints.
---

## Responsive Viewport Tracking

### Problem

A page needs one current breakpoint value that updates when viewport dimensions change. `createViewport()` supplies the measurements and owns the browser listeners.

### Solution

Render the current breakpoint into an output element and clean up the subscription and Sentinel on page exit.

```ts
import { createViewport } from '@vielzeug/sentinel';

const output = document.createElement('output');
document.body.append(output);

function observeBreakpoint(): () => void {
  const viewport = createViewport();
  const render = () => {
    const width = viewport.value.width;
    output.value = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  };

  render();
  const unsubscribe = viewport.subscribe(render);

  return () => {
    unsubscribe();
    viewport.dispose();
  };
}

const stopObserving = observeBreakpoint();
// Call stopObserving() when this output is removed.
```

### Pitfalls

- Use CSS media queries when only presentation changes.
- Read the new snapshot from `viewport.value` inside the listener.
- Dispose the Sentinel and unsubscribe the listener when their owner ends.

### Related

- [Viewport API](../api.md#createviewport)
- [Responsive Column Layout](./responsive-column-layout.md)
- [Ripple watch](../../ripple/api.md#watch-and-resources)
