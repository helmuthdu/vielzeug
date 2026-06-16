---
title: 'Orbit Examples — Dropdown / Select'
description: 'Dropdown / Select example for @vielzeug/orbit.'
---

## Dropdown / Select

### Problem

A custom select dropdown must align its panel to the trigger button, match the trigger's width, and flip above the trigger when there is not enough room below the viewport fold.

### Solution

Match the dropdown width to the trigger and flip up when there is not enough room below.

```ts
import { float, flip, shift, size } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#select-trigger')!;
const dropdown = document.querySelector<HTMLElement>('#select-dropdown')!;

let handle: ReturnType<typeof float> | null = null;

function open() {
  dropdown.setAttribute('data-open', '');
  handle = float(trigger, dropdown, {
    placement: 'bottom-start',
    middleware: [flip({ padding: 6 }), shift({ padding: 6 }), size({ padding: 6 })],
    apply(result) {
      // Match dropdown width to the trigger
      dropdown.style.width = `${trigger.getBoundingClientRect().width}px`;
      if (result.middlewareData.size) {
        dropdown.style.maxHeight = `${result.middlewareData.size.availableHeight}px`;
      }
      dropdown.style.left = `${result.x}px`;
      dropdown.style.top = `${result.y}px`;
    },
  });
}

function close() {
  dropdown.removeAttribute('data-open');
  handle?.dispose();
  handle = null;
}
```

---

### Pitfalls

- The `flip` middleware flips to the opposite side when space is insufficient. If the trigger is near the viewport center, the dropdown may alternate sides on resize. Define a stable preferred placement.
- Matching the dropdown width to the trigger via `getBoundingClientRect().width` returns 0 if the reference element is hidden or has `visibility: hidden`. Ensure the trigger is visible before measuring.
- `autoUpdate` fires on scroll and resize. Throttle position updates if the dropdown contains heavy content that re-paints on repositioning.

### Related

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Popover with Arrow](./popover-with-arrow.md)
