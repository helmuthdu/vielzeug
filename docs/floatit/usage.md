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

`positionFloat` is the primary convenience API. It computes the position and immediately applies `left` / `top` inline styles to the floating element, returning the resolved `Placement` (which may differ from the requested one if `flip` was applied).

```ts
const placement = await positionFloat(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

floatingEl.dataset.placement = placement; // react to flips
```

The floating element must have `position: fixed` (or `position: absolute` for absolute strategy) in your CSS for the applied `left`/`top` values to take effect.

## computePosition

The low-level API. Returns `{ x, y, placement }` without touching the DOM — useful when you want to apply styles yourself or integrate with animation libraries.

```ts
const { x, y, placement } = await computePosition(reference, floating, {
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

By default, `positionFloat` / `computePosition` only runs once. If the trigger scrolls, the window resizes, or either element changes size, the position goes stale. `autoUpdate` reacts to all of these automatically.

```ts
let cleanup: (() => void) | null = null;

function show() {
  cleanup = autoUpdate(reference, floating, () => {
    positionFloat(reference, floating, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    });
  });
}

function hide() {
  cleanup?.();
  cleanup = null;
}
```

`autoUpdate` listens to:

- `scroll` on `window` (capturing, covers all scroll ancestors)
- `resize` on `window`
- `ResizeObserver` on both the reference and floating elements

If your floating element's size is fully controlled externally and observing it causes unnecessary update loops, disable floating observation:

```ts
const cleanup = autoUpdate(reference, floating, update, {
  observeFloating: false,
});
```

Always call the returned cleanup when the floating element is hidden to avoid unnecessary reflows.

## Strategy

`Strategy` is currently a typed option (`'fixed' | 'absolute'`) but is not applied by Floatit's internal calculations. `computePosition` always works from viewport-space `getBoundingClientRect()` values, and `positionFloat` applies `left`/`top` inline styles.

In practice, configure your floating element CSS to match viewport-space coordinates (typically `position: fixed`).

## Common Patterns

### Tooltip

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

let cleanup: (() => void) | null = null;

function showTooltip(trigger: Element, tooltip: HTMLElement) {
  tooltip.showPopover?.() ?? tooltip.setAttribute('data-open', '');

  cleanup = autoUpdate(trigger, tooltip, () =>
    positionFloat(trigger, tooltip, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    }).then((p) => {
      tooltip.dataset.placement = p;
    }),
  );
}

function hideTooltip(tooltip: HTMLElement) {
  tooltip.hidePopover?.() ?? tooltip.removeAttribute('data-open');
  cleanup?.();
  cleanup = null;
}
```

### Dropdown / Select

```ts
import { autoUpdate, flip, positionFloat, shift, size } from '@vielzeug/floatit';

function openDropdown(trigger: HTMLElement, panel: HTMLElement) {
  return autoUpdate(trigger, panel, () =>
    positionFloat(trigger, panel, {
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
    }),
  );
}
```
