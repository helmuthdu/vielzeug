---
title: Orbit — Usage Guide
description: Placement, middleware composition, overflow handling, and lifecycle patterns for Orbit.
---

[[toc]]

## Basic Usage

Use `float()` for the common case — it positions the floating element and keeps it in sync.

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

// float() calls autoUpdate internally and returns a cleanup function
const cleanup = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Call on teardown
cleanup();
```

### `computePosition`

Use `computePosition` when you want raw coordinates or need to consume `middlewareData` without automatic DOM updates.

```ts
import { computePosition, flip, offset } from '@vielzeug/orbit';

const { x, y, placement, middlewareData } = computePosition(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip()],
});

floating.style.left = `${x}px`;
floating.style.top = `${y}px`;
```

### `float` with Custom Apply

Pass `apply` for custom rendering or to use CSS transforms instead of `left`/`top`.

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const cleanup = float(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  apply(result, { floating }) {
    floating.style.transform = `translate(${result.x}px, ${result.y}px)`;
    floating.dataset.placement = result.placement;
  },
});

// on teardown:
cleanup();
```

### Presets

`@vielzeug/orbit/presets` provides ready-made middleware stacks for common patterns. Spread into `float()` or `computePosition()`.

```ts
import { float } from '@vielzeug/orbit';
import { presets } from '@vielzeug/orbit/presets';

// One-liner for a tooltip:
const cleanup = float(trigger, tooltip, presets.tooltip());

// Customize a dropdown:
const cleanup2 = float(trigger, menu, {
  ...presets.dropdown({ placement: 'top-start', offset: 4 }),
  autoUpdate: { throttle: 16 },
});
```

Available presets: `tooltip`, `dropdown`, `popover`, `contextMenu`. Each accepts optional `{ offset, padding, placement }`.

---

## Middleware Model

Middleware are pure functions that receive the current state and return partial updates. Return `undefined` when making no change.

```ts
import type { Middleware } from '@vielzeug/orbit';

const snap =
  (grid: number): Middleware =>
  ({ x, y }) => ({
    data: { snap: { grid } },
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  });
```

Available return fields:

- `x` and `y` — override the floating element's position
- `placement` — change side or alignment for the current pass
- `data` — append to `middlewareData`
- `reset` — restart the cycle with fresh coordinates, a new placement, or re-measured rects

## Built-in Middleware

### `offset`

Adds a gap along the main axis, cross axis, or both.

```ts
offset(8);
offset({ mainAxis: 8, crossAxis: 4 });
offset((state) => ({ mainAxis: state.placement.startsWith('top') ? 12 : 8 }));
```

Apply `offset` as the first middleware so that `flip` and `shift` account for the gap.

### `flip`

Preserves the preferred placement until it overflows, then tries a fallback.

```ts
middleware: [flip({ fallbackPlacements: ['right', 'left'] })];
```

When no candidate fits, `flip` picks the placement with the least total overflow rather than leaving the element clipped.

Do not combine `flip()` with `autoPlacement()`.

### `autoPlacement`

Chooses the placement with the most usable space instead of preserving a preferred side.

```ts
middleware: [autoPlacement({ allowedPlacements: ['top', 'bottom'] })];
```

Do not combine `autoPlacement()` with `flip()`.

### `shift`

Keeps the floating element inside the boundary by shifting along the cross axis. Optionally enable `mainAxis` shifting.

```ts
middleware: [shift({ padding: { top: 8, bottom: 16, left: 6, right: 6 } })];
// Also shift on the main axis when flip is not in the pipeline:
middleware: [shift({ mainAxis: true, padding: 8 })];
```

### `size`

Reports available space so the floating element can be constrained.

```ts
middleware: [
  size({
    padding: 8,
    apply({ availableHeight, elements }) {
      elements.floating.style.maxHeight = `${availableHeight}px`;
    },
  }),
];
```

Or read the data from the result directly:

```ts
const { middlewareData } = computePosition(ref, el, { middleware: [flip(), size()] });
el.style.maxHeight = `${middlewareData.size!.availableHeight}px`;
```

### `arrow`

Produces coordinates for an arrow element. Place after `flip()` and `shift()` so the arrow reflects the final position.

```ts
import type { ArrowData } from '@vielzeug/orbit';

const { middlewareData } = computePosition(reference, floating, {
  middleware: [offset(12), flip(), shift({ padding: 8 }), arrow({ element: arrowEl, padding: 6 })],
});

const { x, y } = middlewareData.arrow as ArrowData;
arrowEl.style.left = x != null ? `${x}px` : '';
arrowEl.style.top  = y != null ? `${y}px` : '';
```

### `hide`

Reports whether the reference is clipped or the floating element has escaped the boundary.

```ts
import type { HideData } from '@vielzeug/orbit';

const { middlewareData } = computePosition(reference, floating, {
  middleware: [hide()],
});

const { referenceHidden } = middlewareData.hide as HideData;
floating.style.visibility = referenceHidden ? 'hidden' : 'visible';
```

Use `strategy` to compute only what you need:

```ts
hide({ strategy: 'referenceHidden' }); // only tracks reference
hide({ strategy: 'escaped' });          // only tracks floating
hide({ strategy: 'both' });             // default — both
```

### `inline`

Improves positioning for inline references spanning multiple lines. Import from the dedicated sub-path to avoid bundling it when unused. Place before `flip()`.

```ts
import { inline } from '@vielzeug/orbit/inline';

middleware: [inline({ x: event.clientX, y: event.clientY }), flip(), shift({ padding: 6 })];
```

---

## Middleware Order

Recommended order for the most common full stack:

```ts
import { inline } from '@vielzeug/orbit/inline';

middleware: [
  offset(8),
  inline({ x: pointerX, y: pointerY }), // only for multi-line inline refs
  flip(),                                // or autoPlacement() — not both
  shift({ padding: 6 }),
  size({ apply: ({ availableHeight, elements }) => {
    elements.floating.style.maxHeight = `${availableHeight}px`;
  }}),
  arrow({ element: arrowEl, padding: 6 }),
  hide(),
];
```

Rules:
- `offset` first — ensures flip/shift account for the gap
- `inline` before `flip` — corrects the reference rect before overflow detection
- `flip` XOR `autoPlacement` — combining them has no effect and adds overhead
- `arrow` after `flip`/`shift` — arrow is positioned against the final coordinates

---

## Virtual References

Any object with `getBoundingClientRect()` works as a reference. Use virtual references for context menus and text selection anchors.

```ts
import { computePosition, flip, shift } from '@vielzeug/orbit';

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const { x, y } = computePosition(
    { getBoundingClientRect: () => DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }) },
    menu,
    { middleware: [flip(), shift({ padding: 8 })] },
  );

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
});
```

Or use the preset, which sets the correct defaults:

```ts
import { float } from '@vielzeug/orbit';
import { presets } from '@vielzeug/orbit/presets';

const { x, y } = computePosition(virtualRef, menu, presets.contextMenu());
```

---

## `autoUpdate`

`autoUpdate` is the lower-level primitive behind `float`.

```ts
import { autoUpdate, computePosition, offset, flip, shift, arrow } from '@vielzeug/orbit';

const cleanup = autoUpdate(
  reference,
  floating,
  () => {
    const { x, y, placement, middlewareData } = computePosition(reference, floating, {
      middleware: [offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl })],
    });

    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;
    floating.dataset.placement = placement;
  },
  { animationFrame: false, throttle: 0 },
);
```

Use `animationFrame: true` only when the reference itself animates between frames.
Use `throttle: N` to rate-limit updates in busy scroll containers.

---

## CSS Anchor Positioning

Pass `preferCssAnchor: true` to `float()` to use native CSS Anchor Positioning in supporting browsers. The browser handles repositioning with no JS overhead and no event listeners.

```ts
const cleanup = float(trigger, tooltip, {
  placement: 'top',
  preferCssAnchor: true,
});
```

Requirements and fallback behaviour:

- Falls back to JS positioning when the browser does not support CSS Anchor Positioning
- Falls back when `middleware` is non-empty (middleware requires JS coordinates)
- Falls back when a custom `apply` callback is provided
- `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` is applied automatically

---

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { float, offset, flip, shift } from '@vielzeug/orbit';

function Tooltip({ anchor, children }: { anchor: HTMLElement | null; children: React.ReactNode }) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    return float(anchor, tooltipRef.current, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
  }, [anchor]);

  return <div ref={tooltipRef} role="tooltip" style={{ position: 'fixed' }}>{children}</div>;
}
```

```ts [Vue 3]
import { watchEffect } from 'vue';
import { float, offset, flip, shift } from '@vielzeug/orbit';

function useFloat(referenceRef: { value: HTMLElement | null }, floatingRef: { value: HTMLElement | null }) {
  watchEffect((onCleanup) => {
    const reference = referenceRef.value;
    const floating = floatingRef.value;
    if (!reference || !floating) return;

    const cleanup = float(reference, floating, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    onCleanup(() => cleanup());
  });
}
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { float, offset, flip, shift } from '@vielzeug/orbit';

  export let anchor: HTMLElement;
  let tooltipEl: HTMLDivElement;

  onMount(() => {
    return float(anchor, tooltipEl, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
  });
</script>

<div bind:this={tooltipEl} role="tooltip" style="position: fixed">
  <slot />
</div>
```

:::

### Pitfalls

- **React:** `float()` must run after the tooltip is in the DOM. Use a `useEffect` dependency on `open` state, not just on `anchor`.
- **Vue 3:** When using `v-if`, `ref.value` is `null` until the next tick. `watchEffect` re-runs automatically when the ref populates.
- **Svelte:** `{#if}` defers `bind:this` to the next microtask. `onMount` runs after the DOM is ready, which is the correct place.

---

## Working with Other Vielzeug Libraries

### With Craft

Use Orbit inside a Craft component to position tooltips and popovers reactively.

```ts
import { define, onMounted } from '@vielzeug/craft';
import { float, offset, flip, shift } from '@vielzeug/orbit';

define('x-tooltip', {
  setup({ host }) {
    let cleanup: (() => void) | undefined;

    onMounted(() => {
      const tooltipEl = host.el.querySelector<HTMLElement>('[role=tooltip]')!;

      cleanup = float(host.el, tooltipEl, {
        placement: 'bottom',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      });

      // Returned from onMounted — Craft calls this on disconnect
      return () => cleanup?.();
    });
  },
});
```

---

## Best Practices

- Use `float()` for the common tooltip/popover case; use `computePosition()` when you need raw coordinates or custom rendering.
- Always call the cleanup function returned by `float()` and `autoUpdate()` when the floating element is removed from the DOM.
- Use either `flip()` or `autoPlacement()` — not both.
- Apply `offset()` before `flip()` or `autoPlacement()` so overflow detection accounts for the gap.
- Use `shift({ padding })` to keep the floating element away from viewport edges.
- Use virtual references for context menus and cursor-anchored popovers.
- Set `animationFrame: true` only when the reference itself animates between frames.
- Use `presets.*()` for common patterns to avoid repeating the same middleware stacks across your codebase.
