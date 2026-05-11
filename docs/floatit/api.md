---
title: Floatit — API Reference
description: Complete API reference for the Floatit floating positioning library.
---

# Floatit API Reference

[[toc]]

## Core Functions

### `float(reference, floating, options?)`

Positions the floating element immediately and keeps it in sync. Returns a cleanup function.

```ts
const cleanup = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});
```

### `positionFloat(reference, floating, options?)`

Computes the position, applies `left` and `top`, and returns the full result including `middlewareData`.

```ts
const result = positionFloat(trigger, popover, {
  middleware: [arrow({ element: arrowEl }), hide()],
});

popover.dataset.placement = result.placement;
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

Returns per-side overflow offsets for either the floating or reference rect.

Positive numbers mean overflow. Negative numbers mean remaining available space.

```ts
const overflow = detectOverflow(state, {
  padding: { top: 8, bottom: 8 },
});
```

### `getMiddlewareData(carrier, key)`

Gets typed middleware data from either `computePosition` / `positionFloat` results or middleware state.

```ts
const arrowData = getMiddlewareData<ArrowData>(result, 'arrow');
```

### `getArrowData(carrier)`

Typed helper for `middlewareData.arrow`.

```ts
const arrowData = getArrowData(result);
```

### `getHideData(carrier)`

Typed helper for `middlewareData.hide`.

```ts
const hideData = getHideData(result);
```

## Middleware

### `offset(value)`

Adds distance along the main axis.

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

const arrowData = getArrowData(result);
```

### `hide(options?)`

Provides visibility metadata in `middlewareData.hide`.

Options:

- `strategy?: 'referenceHidden' | 'escaped'`
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
type Padding = number | Partial<{
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
  reset?: true | { placement?: Placement; rects?: true | { reference: Rect; floating: Rect } };
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

`computePosition`, `positionFloat`, `float`, and `autoUpdate` all accept `ReferenceElement`.

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
