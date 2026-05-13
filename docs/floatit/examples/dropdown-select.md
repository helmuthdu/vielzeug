---
title: 'Floatit Examples — Dropdown / Select'
description: 'Dropdown / Select examples for floatit.'
---

## Dropdown / Select

### Problem

A custom select dropdown must align its panel to the trigger button, match the trigger's width, and flip above the trigger when there is not enough room below the viewport fold.

### Solution

Match the dropdown width to the trigger and flip up when there is not enough room below.

```ts
import { float, flip, shift, size } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#select-trigger')!;
const dropdown = document.querySelector<HTMLElement>('#select-dropdown')!;

let cleanup: (() => void) | null = null;

function open() {
  dropdown.setAttribute('data-open', '');
  cleanup = float(trigger, dropdown, {
    placement: 'bottom-start',
    middleware: [
      flip({ padding: 6 }),
      shift({ padding: 6 }),
      size({
        padding: 6,
        apply({ elements }) {
          const width = (elements.reference as HTMLElement).getBoundingClientRect().width;
          elements.floating.style.width = `${width}px`;
        },
      }),
    ],
  });
}

function close() {
  dropdown.removeAttribute('data-open');
  cleanup?.();
  cleanup = null;
}
```

---


### Pitfalls

- The `flip` middleware flips to the opposite side when space is insufficient. If the trigger is near the viewport center, the dropdown may alternate sides on resize. Define a stable preferred placement.
- Matching the dropdown width to the trigger via `getBoundingClientRect().width` returns 0 if the reference element is hidden or has `visibility: hidden`. Ensure the trigger is visible before measuring.
- `autoUpdate` fires on scroll and resize. Throttle position updates if the dropdown contains heavy content that re-paints on repositioning.

### Related
- [DOM Virtual List Combobox Pattern (Virtualit)](/virtualit/examples/dom-virtual-list-combobox-pattern)

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Popover with Arrow](./popover-with-arrow.md)
