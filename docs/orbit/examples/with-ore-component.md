---
title: With Ore Component
description: Own an Orbit positioner through an Ore component lifecycle.
---

## With Ore Component

### Problem

A custom element must start positioning only after both trigger and panel mount, then release listeners on disconnect.

### Solution

Create the positioner in `onMounted` and dispose it through `onCleanup`.

```ts
import { createPositioner, offset } from '@vielzeug/orbit';
import { define, onCleanup, onMounted, ref } from '@vielzeug/ore';

define('app-popover', {
  setup() {
    const trigger = ref<HTMLElement>();
    const panel = ref<HTMLElement>();

    onMounted(() => {
      const positioner = createPositioner(trigger.value!, panel.value!, {
        middleware: [offset(8)],
      });

      positioner.start();
      onCleanup(() => positioner.dispose());
    });

    return { panel, trigger };
  },
});
```

### Pitfalls

- Do not start before refs resolve.
- Use `strategy: 'absolute'` for panel-relative positioning.

### Related

- [Orbit Usage Guide](../usage.md)
- [Tooltip](./tooltip.md)
