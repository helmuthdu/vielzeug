---
title: Floatit — Examples
description: Copy-paste ready positioning recipes for tooltips, dropdowns, menus, and popovers.
---

## Floatit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations and [API Reference](./api.md) for type signatures.
:::

[[toc]]

## Tooltip

A popover-based tooltip that flips and shifts to stay visible.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

let cleanup: (() => void) | null = null;

function show() {
  tooltip.showPopover();
  cleanup = autoUpdate(trigger, tooltip, () =>
    positionFloat(trigger, tooltip, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    }).then((p) => {
      tooltip.dataset.placement = p;
    }),
  );
}

function hide() {
  tooltip.hidePopover();
  cleanup?.();
  cleanup = null;
}

trigger.addEventListener('mouseenter', show);
trigger.addEventListener('mouseleave', hide);
trigger.addEventListener('focusin',    show);
trigger.addEventListener('focusout',   hide);
```

```css
#tooltip {
  position: fixed;
  inset: unset;
  margin: 0;
}
```

---

## Dropdown / Select

Match the dropdown width to the trigger and flip up when there is not enough room below.

```ts
import { autoUpdate, flip, positionFloat, shift, size } from '@vielzeug/floatit';

const trigger  = document.querySelector<HTMLElement>('#select-trigger')!;
const dropdown = document.querySelector<HTMLElement>('#select-dropdown')!;

let cleanup: (() => void) | null = null;

function open() {
  dropdown.setAttribute('data-open', '');
  cleanup = autoUpdate(trigger, dropdown, () =>
    positionFloat(trigger, dropdown, {
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
    }),
  );
}

function close() {
  dropdown.removeAttribute('data-open');
  cleanup?.();
  cleanup = null;
}
```

---

## Context Menu

Right-click context menu pinned to the cursor position using a virtual reference element.

```ts
import { flip, positionFloat, shift } from '@vielzeug/floatit';

const menu = document.querySelector<HTMLElement>('#context-menu')!;

document.addEventListener('contextmenu', async (e) => {
  e.preventDefault();

  // Create a zero-size virtual element at the cursor
  const virtualRef = {
    getBoundingClientRect: () => DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
  };

  menu.style.display = 'block';

  await positionFloat(virtualRef as Element, menu, {
    placement: 'bottom-start',
    middleware: [flip(), shift({ padding: 8 })],
  });
});

document.addEventListener('click', () => {
  menu.style.display = 'none';
});
```

---

## Popover with Arrow

Align an arrow element with the placement side by using `dataset.placement`.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#btn')!;
const popover = document.querySelector<HTMLElement>('#popover')!;

let cleanup: (() => void) | null = null;

async function update() {
  const placement = await positionFloat(trigger, popover, {
    placement: 'top',
    middleware: [offset(12), flip(), shift({ padding: 8 })],
  });
  popover.dataset.placement = placement;
}

trigger.addEventListener('click', () => {
  if (popover.hasAttribute('data-open')) {
    popover.removeAttribute('data-open');
    cleanup?.();
    cleanup = null;
  } else {
    popover.setAttribute('data-open', '');
    cleanup = autoUpdate(trigger, popover, update);
  }
});
```

```css
/* Arrow pointing down (placement = top) */
#popover[data-placement='top']    .arrow { bottom: -5px; }
#popover[data-placement='bottom'] .arrow { top: -5px; }
#popover[data-placement='left']   .arrow { right: -5px; }
#popover[data-placement='right']  .arrow { left: -5px; }
```

---

## Custom Middleware

Snap the floating element to the nearest 4px grid.

```ts
import { positionFloat, flip, offset, type Middleware } from '@vielzeug/floatit';

const snap = (grid: number): Middleware => ({
  name: 'snap',
  fn: (state) => ({
    ...state,
    x: Math.round(state.x / grid) * grid,
    y: Math.round(state.y / grid) * grid,
  }),
});

await positionFloat(trigger, floating, {
  placement: 'bottom',
  middleware: [offset(8), flip(), snap(4)],
});
```

---

## With Craftit Component

Usage inside a [@vielzeug/craftit](/craftit/) component with automatic `autoUpdate` cleanup.

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';
import { define, onMount, signal } from '@vielzeug/craftit';

define('my-tooltip', ({ host }) => {
  const visible = signal(false);
  let tooltipEl: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;

  function update() {
    if (!tooltipEl) return;
    positionFloat(host, tooltipEl, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    });
  }

  onMount(() => {
    host.addEventListener('mouseenter', () => {
      visible.value = true;
      cleanup = autoUpdate(host, tooltipEl!, update);
    });
    host.addEventListener('mouseleave', () => {
      visible.value = false;
      cleanup?.();
      cleanup = null;
    });

    // Cleanup is run automatically on unmount by craftit
    return () => cleanup?.();
  });
});
```
