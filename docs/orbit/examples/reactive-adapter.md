---
title: Reactive Adapter
description: Consume Orbit position results through Ripple with @vielzeug/orbit/reactive.
---

## Reactive Adapter

### Problem

A reactive UI needs position values rather than direct style writes.

### Solution

Install Ripple and create a reactive positioner.

```ts
import { createReactivePositioner } from '@vielzeug/orbit/reactive';
import { effect } from '@vielzeug/ripple';

const positioner = createReactivePositioner(trigger, tooltip, { placement: 'top' });

effect(() => {
  const position = positioner.position.value;
  if (!position) return;

  tooltip.style.left = `${position.x}px`;
  tooltip.style.top = `${position.y}px`;
});
```

### Pitfalls

- `/reactive` requires `@vielzeug/ripple`.
- Dispose the positioner with its owner.

### Related

- [Orbit Usage Guide](../usage.md)
- [Tooltip](./tooltip.md)
