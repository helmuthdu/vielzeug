---
title: Floatit — API Reference
description: Complete API reference for the Floatit floating positioning library.
---

[[toc]]

## Package Entry Point

| Import                | Purpose                |
| --------------------- | ---------------------- |
| `@vielzeug/floatit`   | Main exports and types |

## API At a Glance

| Symbol                  | Purpose                                        | Execution mode | Common gotcha                                             |
| ----------------------- | ---------------------------------------------- | -------------- | --------------------------------------------------------- |
| `float()`               | Position a floating element and auto-update    | Sync           | Returns cleanup function — call it on teardown            |
| `computePosition()`     | Compute position once without auto-update      | Async          | Does not watch for resize/scroll changes                  |
| `autoUpdate()`          | Re-run position on scroll/resize               | Sync           | Returns cleanup — always call on unmount                  |
| `offset()`              | Add space between reference and floating       | Middleware     | Value is in CSS pixels                                    |
| `flip()`                | Flip to opposite side when clipped             | Middleware     | Combine with `shift` for best overflow handling           |
| `shift()`               | Shift along axis to stay in view               | Middleware     | Does not change placement, only adjusts position          |
| `autoPlacement()`       | Automatically pick best placement              | Middleware     | Cannot be combined with `flip`                            |
| `arrow()`               | Position an arrow element pointing to origin   | Middleware     | Arrow element must be a child of the floating element     |

## Core Functions

### `float(reference, floating, options?)`

Positions the floating element immediately and keeps it in sync. Returns a cleanup function.

By default it writes `left` and `top` styles. Pass `apply` to customize rendering.

```ts
const cleanup = float(trigger, tooltip, {
  apply(result, { floating }) {
    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;
    floating.dataset.placement = result.placement;
  },
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});
```

### `computePosition(reference, floating, options?)`

Low-level positioning engine. Returns `x`, `y`, `placement`, and `middlewareData` without mutating the DOM.

```ts
const { x, y, placement, middlewareData } = computePosition(trigger, panel, {
  middleware: [offset(8), flip(), arrow({ element: arrowEl })],
});
```

### `autoUpdate(reference, floating, update, options?)`

Calls `update` immediately, then re-runs it when layout conditions change.

Supported triggers:

- `scroll` on `window` in capture phase
- `resize` on `window`
- `ResizeObserver` on the reference and optionally the floating element
- `visualViewport` resize and scroll events
- `requestAnimationFrame` when `animationFrame: true`

### `detectOverflow(state, options?)`

Returns per-side overflow offsets for the floating rect.

Positive numbers mean overflow. Negative numbers mean remaining available space.

```ts
const overflow = detectOverflow(state, {
  padding: { top: 8, bottom: 8 },
});
```

## Middleware

### `offset(value)`

Adds distance along the main axis, cross axis, or both.

```ts
offset(8);
offset({ mainAxis: 8, crossAxis: 4 });
offset((state) => ({ mainAxis: state.placement.startsWith('top') ? 12 : 8 }));
```

### `flip(options?)`

Changes placement when the current placement overflows.

Options:

- `padding?: Padding`
- `boundary?: Element | Rect`
- `fallbackPlacements?: Placement[]`

### `autoPlacement(options?)`

Chooses the placement with the most usable space.

Options:

- `padding?: Padding`
- `boundary?: Element | Rect`
- `allowedPlacements?: Placement[]`

Do not combine `autoPlacement()` with `flip()`.

### `shift(options?)`

Shifts the floating element inside the configured boundary.

Options:

- `padding?: Padding`
- `boundary?: Element | Rect`

### `size(options?)`

Reports available space and lets you resize the floating element.

Options:

- `padding?: Padding`
- `boundary?: Element | Rect`
- `apply?: (args: SizeApplyArgs) => void`

### `arrow(options)`

Provides arrow coordinates in `middlewareData.arrow`.

```ts
const result = computePosition(trigger, popover, {
  middleware: [arrow({ element: arrowEl, padding: 6 })],
});

const arrowData = result.middlewareData.arrow as ArrowData | undefined;
```

### `hide(options?)`

Provides visibility metadata in `middlewareData.hide`.

Options:

- `strategy?: 'referenceHidden' | 'escaped' | 'both'` (default: `'both'`)
- `padding?: Padding`
- `boundary?: Element | Rect`

### `inline(options?)`

Chooses a more accurate client rect for inline references spanning multiple lines.

Options:

- `x?: number`
- `y?: number`
- `padding?: Padding`

## Types

### `Placement`

```ts
type Side = 'top' | 'bottom' | 'left' | 'right';
type Alignment = 'start' | 'end';
type Placement = Side | `${Side}-${Alignment}`;
```

### `Padding`

```ts
type Padding =
  | number
  | Partial<{
      top: number;
      right: number;
      bottom: number;
      left: number;
    }>;
```

### `MiddlewareState`

```ts
interface MiddlewareState {
  x: number;
  y: number;
  initialPlacement: Placement;
  placement: Placement;
  rects: { reference: Rect; floating: Rect };
  elements: { reference: ReferenceElement; floating: HTMLElement };
  middlewareData: Record<string, unknown>;
}
```

### `MiddlewareResult`

```ts
interface MiddlewareResult {
  x?: number;
  y?: number;
  placement?: Placement;
  data?: Record<string, unknown>;
  reset?: { placement?: Placement; rects?: true | { reference: Rect; floating: Rect } };
}
```

### `Middleware`

```ts
type Middleware = (state: MiddlewareState) => MiddlewareResult | void;
```

### `ComputePositionResult`

```ts
interface ComputePositionResult {
  x: number;
  y: number;
  placement: Placement;
  middlewareData: Record<string, unknown>;
}
```

### `ReferenceElement`

```ts
interface VirtualReference {
  getBoundingClientRect: () => DOMRect | Rect;
  getClientRects?: () => DOMRectList | DOMRect[];
}

type ReferenceElement = Element | VirtualReference;
```

`computePosition`, `float`, and `autoUpdate` all accept `ReferenceElement`.

### `AutoUpdateOptions`

```ts
interface AutoUpdateOptions {
  observeFloating?: boolean;
  observeVisualViewport?: boolean;
  animationFrame?: boolean;
}
```

### `ArrowData`

```ts
interface ArrowData {
  x?: number;
  y?: number;
  centerOffset: number;
}
```

### `HideData`

```ts
interface HideData {
  referenceHidden?: boolean;
  referenceHiddenOffsets?: SideObject;
  escaped?: boolean;
  escapedOffsets?: SideObject;
}
```
