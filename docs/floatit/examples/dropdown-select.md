---
title: 'Floatit Examples — Dropdown / Select'
description: 'Dropdown / Select examples for floatit.'
---

## Dropdown / Select

## Problem

Implement dropdown / select in a production-friendly way with `@vielzeug/floatit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/floatit` installed.

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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Popover with Arrow](./popover-with-arrow.md)
