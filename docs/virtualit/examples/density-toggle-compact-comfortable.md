---
title: 'Virtualit Examples — Density Toggle (Compact / Comfortable)'
description: 'Density Toggle (Compact / Comfortable) examples for virtualit.'
---

## Density Toggle (Compact / Comfortable)

### Problem

Users can switch between compact and comfortable row heights at runtime. Changing `estimateSize` requires the virtualizer to rebuild its offset table without destroying and recreating the scroll container.

### Solution

Use `update({ estimateSize })` to switch between density modes. Measured heights from the previous mode are automatically cleared.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const DENSITY = { compact: 32, comfortable: 48 };
let mode: keyof typeof DENSITY = 'comfortable';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: DENSITY[mode],
  onChange: render,
});

document.getElementById('toggle-density')!.addEventListener('click', () => {
  mode = mode === 'compact' ? 'comfortable' : 'compact';
  virt.update({ estimateSize: DENSITY[mode] });
});
```

---


### Pitfalls

- Calling `update({ estimateSize })` triggers a full layout recalculation. Toggling rapidly (e.g., bound to a slider) causes layout thrashing — debounce the update call.
- Previously measured heights from `measure()` are discarded when `estimateSize` changes. If the user switches back to a previous density, all rows need to be re-measured.
- The scroll position is preserved in pixels after `update()`. If the user was at item 500 and the row height changes, the visible items shift. Scroll to the same logical item index instead of trusting the pixel offset.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
