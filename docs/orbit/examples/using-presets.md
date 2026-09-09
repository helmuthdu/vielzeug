---
title: Using Presets
description: Apply Orbit preset middleware options to a lifecycle positioner.
---

## Using Presets

### Problem

Common tooltip, dropdown, popover, and context-menu patterns repeat placement and middleware choices.

### Solution

Spread a preset into `createPositioner()` options.

```ts
import { createPositioner } from '@vielzeug/orbit';
import { dropdown, tooltip } from '@vielzeug/orbit/presets';

const tooltipPositioner = createPositioner(trigger, tooltipElement, tooltip());

const dropdownPositioner = createPositioner(select, panel, {
  ...dropdown({ offset: 4 }),
  strategy: 'absolute',
});
```

### Pitfalls

- Presets are ordinary options; override fields after spreading them.
- Dispose every positioner independently.

### Related

- [Tooltip](./tooltip.md)
- [Dropdown Select](./dropdown-select.md)
