---
title: Orbit — API Reference
description: Complete API reference for the Orbit floating positioning library.
---

[[toc]]

## API At a Glance

| Symbol              | Purpose                                                      | Execution mode        | Common gotcha                                              |
| ------------------- | ------------------------------------------------------------ | --------------------- | ---------------------------------------------------------- |
| `float()`           | Position a floating element and auto-update                  | Sync, returns cleanup | Call cleanup on teardown                                   |
| `computePosition()` | Compute position once without auto-update                    | Sync                  | Does not watch for layout changes                          |
| `autoUpdate()`      | Re-run position on scroll/resize/resize-observer             | Sync, returns cleanup | Call cleanup on teardown                                   |
| `detectOverflow()`  | Per-side overflow of the floating rect against boundary      | Sync                  | Positive = overflow, negative = remaining space            |
| `getSide()`         | Extract the primary side from a placement string             | Sync                  | —                                                          |
| `getAlignment()`    | Extract the alignment from a placement string                | Sync                  | Returns `null` for cardinal placements                     |
| `offset()`          | Add space between reference and floating element             | Middleware            | Apply before `flip` so flip accounts for the gap           |
| `flip()`            | Flip to opposite side when clipped                           | Middleware            | Do not combine with `autoPlacement`                        |
| `autoPlacement()`   | Automatically pick the placement with the most space         | Middleware            | Do not combine with `flip`                                 |
| `shift()`           | Shift along boundary to keep element in view                 | Middleware            | Does not change placement, only adjusts coordinates        |
| `size()`            | Report available space; optionally resize the float          | Middleware            | Call before `arrow` when resizing changes float dimensions |
| `arrow()`           | Position an arrow element pointing to the reference          | Middleware            | Arrow element must be a child of the floating element      |
| `hide()`            | Detect when reference or floating is hidden outside boundary | Middleware            | Combine with CSS `visibility` or `opacity`                 |
| `inline()`          | Accurate rect for inline references spanning multiple lines  | Middleware            | Import from `@vielzeug/orbit/inline`                       |
| `presets.*`         | Pre-configured placement + middleware stacks                 | Factory               | Import from `@vielzeug/orbit/presets`                      |

## Package Entry Points

| Import                    | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `@vielzeug/orbit`         | Core API, middleware, utilities, types  |
| `@vielzeug/orbit/inline`  | `inline` middleware for multi-line refs |
| `@vielzeug/orbit/presets` | Pre-configured middleware stacks        |

---

## Core Functions

### `float(reference, floating, options?)`

```ts
float(reference: ReferenceElement, floating: HTMLElement, options?: FloatOptions): Cleanup;
```

Positions `floating` relative to `reference` and keeps it in sync. Returns a `Cleanup` function — **always call it** to remove scroll and resize listeners.

By default, writes `left` and `top` CSS properties. The floating element must have `position: fixed`.

**Example:**

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const cleanup = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// on teardown:
cleanup();
```

**Options — `FloatOptions`**

| Option            | Type                            | Default    | Description                                                                                               |
| ----------------- | ------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `placement`       | `Placement`                     | `'bottom'` | Initial placement. Middleware may change it.                                                              |
| `middleware`      | `Middleware[]`                  | `[]`       | Middleware pipeline.                                                                                      |
| `apply`           | `(result, elements) => void`    | —          | Custom DOM write callback. Defaults to writing `left`/`top`. Providing this disables the CSS anchor path. |
| `autoUpdate`      | `AutoUpdateOptions \| false`    | `{}`       | Auto-update options. Pass `false` to position once without listeners.                                     |
| `preferCssAnchor` | `boolean`                       | `false`    | Use CSS Anchor Positioning when supported. Requires no `middleware` and no custom `apply`.                |

When `preferCssAnchor: true`, `float()` uses native CSS Anchor Positioning in supporting browsers (no scroll listeners, no JS updates). It falls back to JS positioning when the browser does not support it, when `middleware` is non-empty, or when a custom `apply` is provided.

**Returns:** `Cleanup` (`() => void`)

---

### `computePosition(reference, floating, options?)`

```ts
computePosition(reference: ReferenceElement, floating: HTMLElement, options?: ComputePositionOptions): ComputePositionResult;
```

Synchronously computes the position of `floating` relative to `reference`. Returns coordinates and middleware data without mutating the DOM.

**Example:**

```ts
import { arrow, computePosition, flip, offset } from '@vielzeug/orbit';

const { x, y, placement, middlewareData } = computePosition(trigger, panel, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), arrow({ element: arrowEl })],
});
```

**Options — `ComputePositionOptions`**

| Option      | Type                                                       | Default    | Description                                          |
| ----------- | ---------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `placement` | `Placement`                                                | `'bottom'` | Initial placement for this computation.              |
| `middleware` | `Array<Middleware \| null \| undefined \| false>`          | `[]`       | Middleware pipeline. Falsy entries are skipped.      |

**Returns — `ComputePositionResult`**

| Field            | Type             | Description                                    |
| ---------------- | ---------------- | ---------------------------------------------- |
| `x`              | `number`         | Left position in viewport-relative pixels.     |
| `y`              | `number`         | Top position in viewport-relative pixels.      |
| `placement`      | `Placement`      | Resolved placement after middleware.           |
| `middlewareData` | `MiddlewareData` | Accumulated data from all middleware.          |

---

### `autoUpdate(reference, floating, update, options?)`

```ts
autoUpdate(reference: ReferenceElement, floating: HTMLElement, update: () => void, options?: AutoUpdateOptions): Cleanup;
```

Calls `update` immediately, then re-calls it whenever the reference or floating element could have moved. Returns a `Cleanup` function.

**Example:**

```ts
import { autoUpdate, computePosition } from '@vielzeug/orbit';

const cleanup = autoUpdate(reference, floating, () => {
  const { x, y } = computePosition(reference, floating, options);
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;
});
```

Supported triggers:

- `scroll` on `window` (capture phase)
- `resize` on `window`
- `ResizeObserver` on the reference and optionally the floating element
- `visualViewport` resize and scroll (pinch-zoom)
- `requestAnimationFrame` loop when `animationFrame: true`

**Options — `AutoUpdateOptions`**

| Option                  | Type      | Default | Description                                                                                       |
| ----------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------- |
| `observeFloating`       | `boolean` | `true`  | Watch the floating element for size changes.                                                      |
| `observeVisualViewport` | `boolean` | `true`  | Track visual viewport scroll and resize.                                                          |
| `animationFrame`        | `boolean` | `false` | Re-position on every animation frame. Use only when the reference itself animates.                |
| `throttle`              | `number`  | `0`     | Throttle updates to at most once every N ms. Uses leading + trailing strategy. `0` = no throttle. |

**Returns:** `Cleanup` (`() => void`)

---

### `detectOverflow(state, options?)`

```ts
detectOverflow(state: MiddlewareState, options?: DetectOverflowOptions): SideObject;
```

Returns the per-side overflow of the floating element's current rect against its boundary. Positive values indicate overflow; negative values indicate remaining space. Used internally by all overflow-aware middleware and available for custom middleware authors.

**Example:**

```ts
import { detectOverflow } from '@vielzeug/orbit';

const overflow = detectOverflow(state, {
  boundary: document.querySelector('#scroll-container'),
  padding: { top: 8, bottom: 8 },
});
// overflow.top > 0 → element is clipped at the top
```

**Options — `DetectOverflowOptions`**

| Option     | Type              | Default         | Description                        |
| ---------- | ----------------- | --------------- | ---------------------------------- |
| `boundary` | `Element \| Rect` | visual viewport | Boundary to check against.         |
| `padding`  | `Padding`         | `0`             | Inset padding inside the boundary. |

**Returns:** `SideObject`

---

### `getSide(placement)`

```ts
getSide(placement: Placement): Side;
```

Extracts the primary side from a placement string.

**Returns:** `Side`

**Example:**

```ts
import { getSide } from '@vielzeug/orbit';

getSide('bottom-start'); // → 'bottom'
getSide('left');         // → 'left'
```

---

### `getAlignment(placement)`

```ts
getAlignment(placement: Placement): Alignment | null;
```

Extracts the alignment from a placement string. Returns `null` for cardinal placements.

**Returns:** `Alignment | null`

**Example:**

```ts
import { getAlignment } from '@vielzeug/orbit';

getAlignment('top-start'); // → 'start'
getAlignment('bottom');    // → null
```

---

## Middleware

Middleware are pure functions: `(state: MiddlewareState) => MiddlewareResult | void`. They run in array order on each positioning cycle. Return `void` or `undefined` when making no change.

### `offset(value)`

```ts
offset(value: OffsetValue): Middleware;
```

Adds distance along the main axis, cross axis, or both. Apply before `flip` or `autoPlacement` so those middlewares account for the gap.

**Returns:** `Middleware`

**Example:**

```ts
import { offset } from '@vielzeug/orbit';

offset(8);
offset({ mainAxis: 8, crossAxis: 4 });
offset((state) => ({ mainAxis: state.placement.startsWith('top') ? 12 : 8 }));
```

**`OffsetValue`**

```ts
type OffsetValue =
  | number
  | { mainAxis?: number; crossAxis?: number }
  | ((state: MiddlewareState) => number | { mainAxis?: number; crossAxis?: number });
```

---

### `flip(options?)`

```ts
flip(options?: FlipOptions): Middleware;
```

Changes placement to the opposite side (or a custom fallback) when the current placement overflows the boundary. When no candidate fits, picks the one with the least total overflow.

Do not combine with `autoPlacement()`.

**Returns:** `Middleware`

**Example:**

```ts
import { flip } from '@vielzeug/orbit';

flip();
flip({ fallbackPlacements: ['right', 'left'], padding: 8 });
```

**Options — `FlipOptions`** (extends `DetectOverflowOptions`)

| Option               | Type              | Default      | Description                                                     |
| -------------------- | ----------------- | ------------ | --------------------------------------------------------------- |
| `fallbackPlacements` | `Placement[]`     | opposite side | Ordered candidates to try when the current placement overflows. |
| `padding`            | `Padding`         | `0`          | Inset from boundary edges.                                      |
| `boundary`           | `Element \| Rect` | visual viewport | Boundary to use for overflow detection.                      |

---

### `autoPlacement(options?)`

```ts
autoPlacement(options?: AutoPlacementOptions): Middleware;
```

Evaluates all allowed placements and picks the one with the most available space and least overflow. Do not combine with `flip()`.

**Returns:** `Middleware`

**Example:**

```ts
import { autoPlacement } from '@vielzeug/orbit';

autoPlacement({ allowedPlacements: ['top', 'bottom'] });
```

**Options — `AutoPlacementOptions`** (extends `DetectOverflowOptions`)

| Option              | Type              | Default                            | Description                              |
| ------------------- | ----------------- | ---------------------------------- | ---------------------------------------- |
| `allowedPlacements` | `Placement[]`     | `['top','right','bottom','left']`  | Placements to consider.                  |
| `padding`           | `Padding`         | `0`                                | Inset from boundary edges.               |
| `boundary`          | `Element \| Rect` | visual viewport                    | Boundary to use for overflow detection.  |

---

### `shift(options?)`

```ts
shift(options?: ShiftOptions): Middleware;
```

Shifts the floating element along the cross axis to keep it inside the boundary. Enable `mainAxis` to also shift along the main axis (useful when `flip` is not in the pipeline).

| Placement        | Cross axis (default) | Main axis (opt-in) |
| ---------------- | -------------------- | ------------------ |
| `top` / `bottom` | horizontal           | vertical           |
| `left` / `right` | vertical             | horizontal         |

**Returns:** `Middleware`

**Example:**

```ts
import { shift } from '@vielzeug/orbit';

shift({ padding: 6 });
shift({ padding: { top: 8, bottom: 8 }, mainAxis: true });
```

**Options — `ShiftOptions`** (extends `DetectOverflowOptions`)

| Option      | Type              | Default         | Description                                                        |
| ----------- | ----------------- | --------------- | ------------------------------------------------------------------ |
| `crossAxis` | `boolean`         | `true`          | Shift along the cross axis.                                        |
| `mainAxis`  | `boolean`         | `false`         | Shift along the main axis.                                         |
| `padding`   | `Padding`         | `0`             | Inset from boundary edges.                                         |
| `boundary`  | `Element \| Rect` | visual viewport | Boundary to shift within.                                          |

---

### `size(options?)`

```ts
size(options?: SizeOptions): Middleware;
```

Reports available space between the reference and boundary edges. Writes to `middlewareData.size`. Optionally calls an `apply` callback for immediate DOM mutations.

**Returns:** `Middleware`

**Example:**

```ts
import { computePosition, size } from '@vielzeug/orbit';

// Read from result (preferred):
const { middlewareData } = computePosition(ref, el, { middleware: [size()] });
el.style.maxHeight = `${middlewareData.size!.availableHeight}px`;

// Or use the apply callback:
size({
  padding: 8,
  apply({ availableHeight, elements }) {
    elements.floating.style.maxHeight = `${availableHeight}px`;
  },
});
```

**Options — `SizeOptions`** (extends `DetectOverflowOptions`)

| Option     | Type                            | Description                                      |
| ---------- | ------------------------------- | ------------------------------------------------ |
| `apply`    | `(args: SizeApplyArgs) => void` | Called after `middlewareData.size` is populated. |
| `padding`  | `Padding`                       | Inset from boundary edges.                       |
| `boundary` | `Element \| Rect`               | Boundary to measure against.                     |

**`SizeApplyArgs`** extends `SizeData`:

| Field             | Type                                                         |
| ----------------- | ------------------------------------------------------------ |
| `availableWidth`  | `number`                                                     |
| `availableHeight` | `number`                                                     |
| `elements`        | `{ reference: ReferenceElement; floating: HTMLElement }`     |

---

### `arrow(options)`

```ts
arrow(options: ArrowOptions): Middleware;
```

Positions an arrow element inside the floating element. Writes `{ x?, y?, centerOffset }` to `middlewareData.arrow`.

Place `arrow()` after `flip()` and `shift()` so the arrow is positioned against the final placement and coordinates.

**Returns:** `Middleware`

**Example:**

```ts
import { arrow, computePosition, flip, offset, shift } from '@vielzeug/orbit';
import type { ArrowData } from '@vielzeug/orbit';

const { middlewareData } = computePosition(ref, floating, {
  middleware: [offset(12), flip(), shift({ padding: 8 }), arrow({ element: arrowEl, padding: 6 })],
});

const { x, y } = middlewareData.arrow as ArrowData;
arrowEl.style.left = x != null ? `${x}px` : '';
arrowEl.style.top  = y != null ? `${y}px` : '';
```

**Options — `ArrowOptions`**

| Option    | Type          | Default | Description                                         |
| --------- | ------------- | ------- | --------------------------------------------------- |
| `element` | `HTMLElement` | —       | The arrow element. Must be a child of the floating. |
| `padding` | `Padding`     | `0`     | Minimum distance from floating element corners.     |

**`ArrowData`**

| Field          | Type                  | Description                                                       |
| -------------- | --------------------- | ----------------------------------------------------------------- |
| `x`            | `number \| undefined` | Arrow x offset (set for `top`/`bottom` placements).              |
| `y`            | `number \| undefined` | Arrow y offset (set for `left`/`right` placements).              |
| `centerOffset` | `number`              | Non-zero when the arrow is clamped away from the ideal position.  |

---

### `hide(options?)`

```ts
hide(options?: HideOptions): Middleware;
```

Detects when the reference or floating element is hidden outside the boundary. Writes to `middlewareData.hide`.

**Returns:** `Middleware`

**Example:**

```ts
import { computePosition, hide } from '@vielzeug/orbit';
import type { HideData } from '@vielzeug/orbit';

const { middlewareData } = computePosition(ref, floating, {
  middleware: [hide()],
});

const { referenceHidden, escaped } = middlewareData.hide as HideData;
floating.style.visibility = referenceHidden ? 'hidden' : 'visible';
```

**Options — `HideOptions`** (extends `DetectOverflowOptions`)

| Option     | Type                                          | Default  | Description                                 |
| ---------- | --------------------------------------------- | -------- | ------------------------------------------- |
| `strategy` | `'referenceHidden' \| 'escaped' \| 'both'`    | `'both'` | Which hidden states to compute.             |
| `padding`  | `Padding`                                     | `0`      | Inset from boundary edges.                  |
| `boundary` | `Element \| Rect`                             | viewport | Boundary to check against.                  |

**`HideData`**

| Field                    | Type                      | Description                                                           |
| ------------------------ | ------------------------- | --------------------------------------------------------------------- |
| `referenceHidden`        | `boolean \| undefined`    | `true` when the reference is fully clipped by the boundary.           |
| `referenceHiddenOffsets` | `SideObject \| undefined` | Per-side overflow of the reference rect.                              |
| `escaped`                | `boolean \| undefined`    | `true` when the floating element has fully left the boundary.         |
| `escapedOffsets`         | `SideObject \| undefined` | Per-side overflow of the floating element.                            |

---

### `inline(options?)` — `@vielzeug/orbit/inline`

```ts
import { inline } from '@vielzeug/orbit/inline';

inline(options?: InlineOptions): Middleware;
```

Improves positioning accuracy for inline references that wrap across line breaks (e.g. `<span>` elements). Must be placed before `flip()` in the pipeline.

**Returns:** `Middleware`

**Example:**

```ts
import { float, flip, shift } from '@vielzeug/orbit';
import { inline } from '@vielzeug/orbit/inline';

float(selectionRef, tooltip, {
  placement: 'top',
  middleware: [inline({ x: pointerX, y: pointerY }), flip(), shift({ padding: 6 })],
});
```

**Options — `InlineOptions`**

| Option    | Type      | Description                                                                                                      |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `x`       | `number`  | Cursor x. When both `x` and `y` are provided, picks the client rect containing the cursor.                       |
| `y`       | `number`  | Cursor y.                                                                                                        |
| `padding` | `Padding` | Hit-test tolerance around rect edges when using cursor coordinates. Has no effect without `x` and `y`. Default: `2`. |

---

## Presets — `@vielzeug/orbit/presets`

Ready-made `{ placement, middleware }` objects for common patterns. Spread into `float()` or `computePosition()` options.

```ts
import { presets } from '@vielzeug/orbit/presets';

const cleanup = float(trigger, tooltip, presets.tooltip());

// Customize:
const cleanup = float(trigger, menu, {
  ...presets.dropdown({ placement: 'top-start', offset: 4 }),
  autoUpdate: { throttle: 16 },
});
```

**`presets.tooltip(options?)`**

Stack: `offset(8) → flip({ padding }) → shift({ padding })`
Default placement: `'top'`

**`presets.dropdown(options?)`**

Stack: `[offset] → flip({ padding }) → shift({ padding }) → size({ padding })`
Default placement: `'bottom-start'`

**`presets.popover(options?)`**

Stack: `offset(12) → flip({ padding }) → shift({ padding })`
Default placement: `'top'`

**`presets.contextMenu(options?)`**

Stack: `[offset] → flip({ padding }) → shift({ padding })`
Default placement: `'bottom-start'`

**`PresetOptions`** (all fields optional)

| Option    | Type        | Description                                   |
| --------- | ----------- | --------------------------------------------- |
| `offset`  | `number`    | Gap in pixels between reference and floating. |
| `padding` | `number`    | Distance from boundary edges.                 |
| `placement` | `Placement` | Override the default placement.             |

Both `PositioningPreset` and `PresetOptions` are also exported as types from the main entry point:

```ts
import type { PositioningPreset, PresetOptions } from '@vielzeug/orbit';
```

---

## Types

### `Placement`

```ts
type Side      = 'top' | 'bottom' | 'left' | 'right';
type Alignment = 'start' | 'end';
type Placement = Side | `${Side}-${Alignment}`;
```

### `Padding`

```ts
type Padding = number | Partial<{ top: number; right: number; bottom: number; left: number }>;
```

### `Rect`

```ts
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### `SideObject`

```ts
interface SideObject {
  top: number;
  right: number;
  bottom: number;
  left: number;
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

### `Middleware`

```ts
type Middleware = (state: MiddlewareState) => MiddlewareResult | void;
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
  middlewareData: MiddlewareData;
}
```

### `MiddlewareResult`

```ts
interface MiddlewareResult {
  x?: number;
  y?: number;
  placement?: Placement;
  data?: MiddlewareData;
  reset?: true | { placement?: Placement; rects?: true | { reference: Rect; floating: Rect } };
}
```

Return `reset: true` to restart the pipeline with the current state. Return `reset: { placement }` to restart with a new placement. Return `reset: { rects: true }` to re-measure both elements before restarting.

### `ComputePositionOptions`

```ts
interface ComputePositionOptions {
  placement?: Placement;
  middleware?: Array<Middleware | null | undefined | false>;
}
```

### `ComputePositionResult`

```ts
interface ComputePositionResult {
  x: number;
  y: number;
  placement: Placement;
  middlewareData: MiddlewareData;
}
```

### `DetectOverflowOptions`

```ts
interface DetectOverflowOptions {
  boundary?: Element | Rect;
  padding?: Padding;
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

### `PositioningPreset`

```ts
interface PositioningPreset {
  placement: Placement;
  middleware: Middleware[];
}
```
