---
title: Orbit — Usage Guide
description: Placement, middleware composition, overflow handling, and lifecycle patterns for Orbit.
---

[[toc]]

## Basic Usage

Use `float()` for the common case — it positions the floating element and keeps it in sync. It returns a `FloatHandle`; call `handle.dispose()` on teardown.

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

const handle = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Call on teardown
handle.dispose();
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

Pass `apply` for custom rendering or to use CSS transforms instead of `left`/`top`. The callback receives the full `ComputePositionResult`; DOM references are available by closure.

```ts
import { float, flip, offset, shift } from '@vielzeug/orbit';

const handle = float(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  apply(result) {
    floating.style.transform = `translate(${result.x}px, ${result.y}px)`;
    floating.dataset.placement = result.placement;
  },
});

// on teardown:
handle.dispose();
```

### Presets

`@vielzeug/orbit/presets` provides ready-made middleware stacks for common patterns. Spread into `float()` or `computePosition()`.

```ts
import { float } from '@vielzeug/orbit';
import { dropdown, tooltip } from '@vielzeug/orbit/presets';

// One-liner for a tooltip:
const handle = float(trigger, tooltip, tooltip());

// Customize a dropdown:
const handle2 = float(trigger, menu, {
  ...dropdown({ placement: 'top-start', offset: 4 }),
  autoUpdate: { throttle: 16 },
});
```

Available presets: `tooltip`, `dropdown`, `popover`, `contextMenu`. Each accepts optional `{ offset, padding, placement }`.

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

Reports available space so the floating element can be constrained. Read `middlewareData.size` in the `apply` callback or a subsequent `computePosition` call.

```ts
const handle = float(ref, el, {
  middleware: [flip(), shift(), size()],
  apply(result) {
    const { size } = result.middlewareData;
    if (size) el.style.maxHeight = `${size.availableHeight}px`;
    el.style.left = `${result.x}px`;
    el.style.top = `${result.y}px`;
  },
});

// Or with computePosition:
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
arrowEl.style.top = y != null ? `${y}px` : '';
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
hide({ strategy: 'escaped' }); // only tracks floating
hide({ strategy: 'both' }); // default — both
```

### `inline`

Improves positioning for inline references spanning multiple lines. Place before `flip()`.

```ts
import { inline } from '@vielzeug/orbit';

middleware: [inline({ x: event.clientX, y: event.clientY }), flip(), shift({ padding: 6 })];
```

## Middleware Order

Recommended order for the most common full stack:

```ts
middleware: [
  offset(8),
  inline({ x: pointerX, y: pointerY }), // only for multi-line inline refs
  flip(), // or autoPlacement() — not both
  shift({ padding: 6 }),
  size(),
  arrow({ element: arrowEl, padding: 6 }),
  hide(),
];
```

Rules:

- `offset` first — ensures flip/shift account for the gap
- `inline` before `flip` — corrects the reference rect before overflow detection
- `flip` XOR `autoPlacement` — combining them has no effect and adds overhead
- `arrow` after `flip`/`shift` — arrow is positioned against the final coordinates

### `compose()` for ordered validation

`compose()` is a drop-in replacement for an inline array literal. It filters falsy entries and throws at call time if middleware are in a known-bad order.

```ts
import { arrow, compose, flip, offset, shift, size } from '@vielzeug/orbit';

const middleware = compose(offset(8), flip(), shift({ padding: 6 }), size(), arrow({ element: arrowEl }));

const handle = float(trigger, floating, { middleware });
```

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
import { computePosition } from '@vielzeug/orbit';
import { contextMenu } from '@vielzeug/orbit/presets';

const { x, y } = computePosition(virtualRef, menu, contextMenu());
```

## `autoUpdate`

`autoUpdate` is the lower-level primitive behind `float`.

```ts
import { autoUpdate, computePosition, arrow, flip, offset, shift } from '@vielzeug/orbit';

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

### `pauseWhenHidden`

Set `pauseWhenHidden: true` (default) to suspend updates while the reference element is scrolled out of the viewport. Uses `IntersectionObserver` internally. A single update fires when the reference becomes visible again.

```ts
const cleanup = autoUpdate(reference, floating, update, {
  pauseWhenHidden: true, // default
});
```

Pass `pauseWhenHidden: false` to keep updating unconditionally (e.g. for pinned headers that are always in view).

### `observeAncestors`

By default (`observeAncestors: true`), Orbit attaches scroll listeners to ancestor scroll containers of the reference element in addition to `window`. This fires more reliably in nested scroll contexts. Pass `false` to use only a capture-phase window listener.

```ts
const cleanup = autoUpdate(reference, floating, update, {
  observeAncestors: false, // single window capture listener
});
```

## Global Boundary and Padding

Pass `boundary` and `padding` on `computePosition()` or `float()` to set defaults for all overflow-aware middleware. Per-middleware options take precedence.

```ts
import { flip, float, shift, size } from '@vielzeug/orbit';

const container = document.querySelector<HTMLElement>('#scroll-container')!;

const handle = float(trigger, floating, {
  // All middleware will clip to #scroll-container instead of the viewport
  boundary: container,
  // 8px inset on all sides
  padding: 8,
  middleware: [flip(), shift(), size()],
});
```

## Containing Block

For floating elements with `position: absolute`, provide `containingBlock` (the `offsetParent`) so Orbit subtracts its offset and returns coordinates relative to the containing block.

```ts
const handle = float(trigger, floating, {
  containingBlock: floating.offsetParent as Element,
  placement: 'bottom',
  middleware: [flip(), shift()],
});
```

Without `containingBlock`, coordinates are viewport-relative (correct for `position: fixed`).

## CSS Anchor Positioning

Use `floatWithAnchor()` to let the browser handle repositioning natively — no JS loop, no event listeners.

```ts
import { floatWithAnchor, isCssAnchorSupported } from '@vielzeug/orbit';

if (isCssAnchorSupported()) {
  const handle = floatWithAnchor(trigger, tooltip, { placement: 'top' });
  // handle.dispose() on teardown
} else {
  // fall back to float()
}
```

Requirements and fallback behaviour:

- Falls back to JS positioning when the browser does not support CSS Anchor Positioning
- Use `float()` instead when you need middleware or a custom `apply` callback
- `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` is applied automatically
- Check `isCssAnchorSupported()` before calling `floatWithAnchor()` in production

## Reactive Adapter

Import from `@vielzeug/orbit/reactive` to get a `@vielzeug/ripple` signal that updates on every position change. DOM styles are **not** automatically applied — use a ripple `effect` to consume `position` and write to the DOM.

```ts
import { effect } from '@vielzeug/ripple';
import { createFloatState } from '@vielzeug/orbit/reactive';
import { flip, offset, shift } from '@vielzeug/orbit';

const handle = createFloatState(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

effect(() => {
  const pos = handle.position.value;
  if (!pos) return;
  tooltip.style.left = `${pos.x}px`;
  tooltip.style.top = `${pos.y}px`;
});

// on teardown:
handle.dispose();
```

`createFloatState` accepts all `FloatOptions` except `apply` (which is used internally to update the signal).

## One-shot Async Positioning

Use `computePositionAsync()` when you need a single position result inside an async function, such as after `await nextTick()` in Vue or after React's `useLayoutEffect` has flushed.

```ts
import { computePositionAsync } from '@vielzeug/orbit';

// Inside an async lifecycle (e.g. Vue onMounted with async)
const result = await computePositionAsync(reference, floating, {
  placement: 'top',
});

floating.style.left = `${result.x}px`;
floating.style.top = `${result.y}px`;
```

`computePositionAsync` defers to the microtask queue. If you need coordinates after the next paint (e.g. after CSS transitions), use `requestAnimationFrame` around `computePosition` directly.

## SSR

For server-side rendering, import from `@vielzeug/orbit/ssr` instead of the main entry. All three exports are no-ops that return zero-coordinate results and safe cleanup functions.

```ts
// vite.config.ts
resolve: {
  alias: {
    '@vielzeug/orbit': process.env.SSR
      ? '@vielzeug/orbit/ssr'
      : '@vielzeug/orbit',
  },
}
```

Or import directly when you know you are in an SSR context:

```ts
import { computePosition } from '@vielzeug/orbit/ssr';

// Returns { x: 0, y: 0, placement: 'bottom', middlewareData: {} }
const result = computePosition(reference, floating, { placement: 'bottom' });
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { float, offset, flip, shift } from '@vielzeug/orbit';

function Tooltip({ anchor, children }: { anchor: HTMLElement | null; children: React.ReactNode }) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    const handle = float(anchor, tooltipRef.current, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    return () => handle.dispose();
  }, [anchor]);

  return (
    <div ref={tooltipRef} role="tooltip" style={{ position: 'fixed' }}>
      {children}
    </div>
  );
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

    const handle = float(reference, floating, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    onCleanup(() => handle.dispose());
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
    const handle = float(anchor, tooltipEl, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    return () => handle.dispose();
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

## Working with Other Vielzeug Libraries

### With Craft

Use Orbit inside a Craft component to position tooltips and popovers reactively.

```ts
import { define, onMounted } from '@vielzeug/craft';
import { float, offset, flip, shift } from '@vielzeug/orbit';

define('x-tooltip', {
  setup({ host }) {
    let handle: ReturnType<typeof float> | undefined;

    onMounted(() => {
      const tooltipEl = host.el.querySelector<HTMLElement>('[role=tooltip]')!;

      handle = float(host.el, tooltipEl, {
        placement: 'bottom',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      });

      // Returned from onMounted — Craft calls this on disconnect
      return () => handle?.dispose();
    });
  },
});
```

## Best Practices

- Use `float()` for the common tooltip/popover case; use `computePosition()` when you need raw coordinates or custom rendering.
- Always call `handle.dispose()` when the floating element is removed from the DOM.
- Use either `flip()` or `autoPlacement()` — not both.
- Apply `offset()` before `flip()` or `autoPlacement()` so overflow detection accounts for the gap.
- Use `shift({ padding })` to keep the floating element away from viewport edges.
- Use `compose()` in development to catch middleware order bugs at call time.
- Use virtual references for context menus and cursor-anchored popovers.
- Set `animationFrame: true` only when the reference itself animates between frames.
- Use preset factories for common patterns to avoid repeating the same middleware stacks across your codebase.
