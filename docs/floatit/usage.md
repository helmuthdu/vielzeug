---
title: Floatit — Usage Guide
description: Middleware composition, placement, autoUpdate, and positioning patterns for Floatit.
---

# Floatit Usage Guide

::: tip New to Floatit?
Start with the [Overview](./index.md) for a quick introduction, then come back here for in-depth patterns.
:::

[[toc]]

## Placement

A `Placement` is a `Side` optionally combined with an `Alignment`:

```text
Side:      'top' | 'bottom' | 'left' | 'right'
Alignment: 'start' | 'end'

Examples:  'top' | 'top-start' | 'top-end'
           'bottom' | 'bottom-start' | 'bottom-end'
           'left' | 'left-start' | 'left-end'
           'right' | 'right-start' | 'right-end'
```

All positions use `getBoundingClientRect` coordinates, meaning they work correctly with `position: fixed` floating elements.

## positionFloat

`positionFloat` computes the position and immediately applies `left` / `top` inline styles to the floating element, returning the resolved `Placement` (which may differ from the requested one if `flip` was applied).

```ts
const placement = positionFloat(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

floatingEl.dataset.placement = placement; // react to flips
```

The floating element must have `position: fixed` in your CSS for the applied `left`/`top` values to take effect.

## computePosition

The low-level API. Returns `{ x, y, placement }` without touching the DOM — useful when you want to apply styles yourself or integrate with animation libraries.

```ts
const { x, y, placement } = computePosition(reference, floating, {
  placement: 'bottom-start',
  middleware: [flip(), shift({ padding: 4 })],
});

floating.style.transform = `translate(${x}px, ${y}px)`;
```

## Middleware

Middleware are small functions that modify the computed position. They run in order, each receiving and returning a `MiddlewareState`.

### offset

Adds a gap (in pixels) between the reference and the floating element along the main axis.

```ts
// 8px gap between reference and floating
middleware: [offset(8)];
```

### flip

Flips the floating element to the opposite side when it would overflow the viewport.

```ts
// Default: flip when any part overflows
middleware: [flip()];

// Keep 8px clearance before flipping
middleware: [flip({ padding: 8 })];
```

When `flip` changes the placement, `computePosition` restarts the middleware pipeline using the new placement so all subsequent middlewares (e.g. `shift`) receive the correct coordinates.

### shift

Slides the floating element along its cross axis so it stays within the viewport.

```ts
// Keep at least 6px from every viewport edge
middleware: [shift({ padding: 6 })];
```

### size

Calls an `apply` callback with `{ availableWidth, availableHeight, elements }`. Use it to constrain or resize the floating element.

```ts
middleware: [
  size({
    padding: 8,
    apply({ availableWidth, elements }) {
      // Match dropdown width to trigger
      elements.floating.style.width = `${elements.reference.getBoundingClientRect().width}px`;
      // or cap the max height
      elements.floating.style.maxHeight = `${availableHeight}px`;
    },
  }),
];
```

### Middleware order matters

Middlewares run sequentially. The recommended order is:

```ts
middleware: [
  offset(8), // 1. push away from reference first
  flip(), // 2. flip side if needed (triggers a pipeline restart)
  shift({ padding: 6 }), // 3. nudge into viewport after final side is known
  size({ apply: ({ availableHeight }) => console.log(availableHeight) }), // 4. resize with final available space
];
```

### Custom middleware

You can write your own by returning a modified `MiddlewareState`:

```ts
import type { Middleware } from '@vielzeug/floatit';

const nudge = (px: number): Middleware => ({
  name: 'nudge',
  fn: (state) => ({ ...state, y: state.y + px }),
});

middleware: [offset(8), nudge(4), flip()];
```

## autoUpdate

## float

`float` is the primary API for dynamic positioning. It positions the floating element immediately and keeps it in sync as the viewport or elements change. It combines `positionFloat` and `autoUpdate` in a single call.

```ts
let cleanup: (() => void) | null = null;

function show() {
  cleanup = float(reference, floating, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
}

function hide() {
  cleanup?.();
  cleanup = null;
}
```

## autoUpdate

`autoUpdate` is the lower-level primitive behind `float`. Use it directly when you need to run custom logic (e.g. reading `placement` to update an arrow) on every reposition.

```ts
const cleanup = autoUpdate(reference, floating, () => {
  const placement = positionFloat(reference, floating, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
  floating.dataset.placement = placement;
});
```

`autoUpdate` calls the callback once immediately on registration, then listens to:

- `scroll` on `window` (capturing, covers all scroll ancestors)
- `resize` on `window`
- `ResizeObserver` on the reference and (by default) the floating element
- `window.visualViewport` (by default, covers pinch-zoom and virtual keyboard)

If your floating element's size is fully controlled externally and observing it causes unnecessary update loops, disable floating observation:

```ts
const cleanup = autoUpdate(reference, floating, update, {
  observeFloating: false,
});
```

Always call the returned cleanup when the floating element is hidden to avoid unnecessary reflows.

## Common Patterns

### Tooltip

```ts
import { float, flip, offset, shift } from '@vielzeug/floatit';

let cleanup: (() => void) | null = null;

function showTooltip(trigger: Element, tooltip: HTMLElement) {
  tooltip.showPopover?.() ?? tooltip.setAttribute('data-open', '');

  cleanup = float(trigger, tooltip, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
}

function hideTooltip(tooltip: HTMLElement) {
  tooltip.hidePopover?.() ?? tooltip.removeAttribute('data-open');
  cleanup?.();
  cleanup = null;
}
```

### Dropdown / Select

```ts
import { float, flip, shift, size } from '@vielzeug/floatit';

function openDropdown(trigger: HTMLElement, panel: HTMLElement) {
  return float(trigger, panel, {
    placement: 'bottom-start',
    middleware: [
      flip({ padding: 6 }),
      shift({ padding: 6 }),
      size({
        padding: 6,
        apply({ elements }) {
          elements.floating.style.width = `${(elements.reference as HTMLElement).offsetWidth}px`;
        },
      }),
    ],
  });
}
```
