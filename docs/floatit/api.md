---
title: Floatit — API Reference
description: Complete API reference for the Floatit floating positioning library.
---

## Floatit API Reference

[[toc]]

## Core Functions

### `positionFloat(reference, floating, options?)`

Computes the floating position and immediately applies `left` / `top` inline styles to the floating element.

**Parameters:**

- `reference: Element` — The anchor element the floating element is positioned relative to
- `floating: HTMLElement` — The element to be positioned
- `options?: FloatOptions` — Optional configuration

**Returns:** `Promise<Placement>` — The resolved placement (which may differ from the requested one after `flip`)

**Example:**

```ts
const placement = await positionFloat(trigger, dropdown, {
  placement: 'bottom-start',
  middleware: [flip(), shift({ padding: 6 })],
});
```

---

### `computePosition(reference, floating, config?)`

Low-level positioning engine. Computes `{ x, y, placement }` without touching the DOM.

**Parameters:**

- `reference: Element` — The anchor element
- `floating: HTMLElement` — The floating element
- `config?: ComputePositionConfig` — Optional configuration

**Returns:** `Promise<ComputePositionResult>`

**Example:**

```ts
const { x, y, placement } = await computePosition(trigger, panel, {
  placement: 'top',
  middleware: [offset(8), flip()],
});
panel.style.transform = `translate(${x}px, ${y}px)`;
```

---

### `autoUpdate(reference, floating, update)`

Automatically re-calls `update` whenever the floating element's position may have changed.

Listens to:

- `scroll` on `window` (capturing — covers all scroll ancestors)
- `resize` on `window`
- `ResizeObserver` on both `reference` and `floating`

**Parameters:**

- `reference: Element` — The anchor element
- `floating: HTMLElement` — The floating element
- `update: () => void` — Callback to re-run positioning

**Returns:** `() => void` — Cleanup function; call it when the floating element is hidden

**Example:**

```ts
const cleanup = autoUpdate(trigger, tooltip, () => {
  positionFloat(trigger, tooltip, { placement: 'top', middleware: [flip()] });
});

// Later, when tooltip is hidden:
cleanup();
```

---

## Middlewares

### `offset(value)`

Adds a pixel gap between the reference element and the floating element along the main axis.

**Parameters:**

- `value: number` — Gap in pixels

**Returns:** `Middleware`

```ts
offset(8) // 8px gap
```

---

### `flip(options?)`

Flips to the opposite side when the preferred side would overflow the viewport.

**Parameters:**

- `options?: FlipOptions`
  - `padding?: number` — Minimum distance from viewport edges before flipping (default: `0`)

**Returns:** `Middleware`

```ts
flip()               // flip when overflow
flip({ padding: 8 }) // flip when within 8px of viewport edge
```

::: info Pipeline restart
When `flip` changes the placement, `computePosition` automatically restarts the middleware pipeline so that all subsequent middlewares (e.g. `shift`) receive the correct base coordinates for the new side.
:::

---

### `shift(options?)`

Slides the floating element along its cross axis to keep it inside the viewport.

**Parameters:**

- `options?: ShiftOptions`
  - `padding?: number` — Minimum distance to maintain from viewport edges (default: `0`)

**Returns:** `Middleware`

```ts
shift()              // clamp to viewport
shift({ padding: 6}) // maintain 6px from edges
```

---

### `size(options?)`

Calls an `apply` callback with available dimensions so the floating element can be resized or constrained.

**Parameters:**

- `options?: SizeOptions`
  - `padding?: number` — Reduce reported available space by this amount on each side (default: `0`)
  - `apply?: (args: SizeApplyArgs) => void` — Called synchronously with `{ availableWidth, availableHeight, elements }`

**Returns:** `Middleware`

```ts
size({
  padding: 8,
  apply({ availableHeight, elements }) {
    elements.floating.style.maxHeight = `${availableHeight}px`;
  },
})
```

---

## Types

### `Placement`

```ts
type Side      = 'top' | 'bottom' | 'left' | 'right';
type Alignment = 'start' | 'end';
type Placement = Side | `${Side}-${Alignment}`;
// e.g. 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | ...
```

### `Strategy`

```ts
type Strategy = 'fixed' | 'absolute';
```

### `FloatOptions`

```ts
interface FloatOptions {
  placement?:  Placement;
  strategy?:   Strategy;
  middleware?: Array<Middleware | null | undefined | false>;
}
```

### `ComputePositionConfig`

```ts
interface ComputePositionConfig {
  placement?:  Placement;
  strategy?:   Strategy;
  middleware?: Array<Middleware | null | undefined | false>;
}
```

### `ComputePositionResult`

```ts
interface ComputePositionResult {
  x:         number;
  y:         number;
  placement: Placement;
}
```

### `Middleware`

```ts
interface Middleware {
  name: string;
  fn:   (state: MiddlewareState) => MiddlewareState;
}
```

### `MiddlewareState`

```ts
interface MiddlewareState {
  x:         number;
  y:         number;
  placement: Placement;
  rects: {
    reference: { x: number; y: number; width: number; height: number };
    floating:  { x: number; y: number; width: number; height: number };
  };
  elements: {
    reference: Element;
    floating:  HTMLElement;
  };
}
```

### `FlipOptions`

```ts
interface FlipOptions {
  /** Minimum distance from the viewport edge before flipping (px). Default: 0 */
  padding?: number;
}
```

### `ShiftOptions`

```ts
interface ShiftOptions {
  /** Minimum distance to maintain from viewport edges (px). Default: 0 */
  padding?: number;
}
```

### `SizeOptions`

```ts
interface SizeOptions {
  /** Reduce available space by this amount on each side (px). Default: 0 */
  padding?: number;
  /** Called synchronously with available dimensions. */
  apply?: (args: SizeApplyArgs) => void;
}
```

### `SizeApplyArgs`

```ts
interface SizeApplyArgs {
  availableWidth:  number;
  availableHeight: number;
  elements: {
    reference: Element;
    floating:  HTMLElement;
  };
}
```
