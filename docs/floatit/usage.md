---
title: Floatit — Usage Guide
description: Placement, middleware composition, overflow handling, and lifecycle patterns for Floatit.
---

[[toc]]

## Positioning APIs

### `computePosition`

Use `computePosition` when you want to render manually or consume `middlewareData` without DOM writes.

```ts
const result = computePosition(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), autoPlacement(), arrow({ element: arrowEl })],
});

floating.style.transform = `translate(${result.x}px, ${result.y}px)`;
```

### `float`

`float` is the high-level API for the common case.

By default it writes `left` and `top`. Use `apply` for custom rendering.

```ts
const cleanup = float(reference, floating, {
  apply(result, { floating }) {
    floating.style.transform = `translate(${result.x}px, ${result.y}px)`;
    floating.dataset.placement = result.placement;
  },
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});
```

## Middleware Model

Middleware are pure functions that return partial updates.

```ts
import type { Middleware } from '@vielzeug/floatit';

const nudge =
  (px: number): Middleware =>
  () => ({ y: px });
```

In practice you normally read from the current state:

```ts
const snap =
  (grid: number): Middleware =>
  ({ x, y }) => ({
    data: { snap: { grid } },
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  });
```

Available return fields:

- `x` and `y` to move the floating element
- `placement` to change side or alignment
- `data` to append to `middlewareData`
- `reset` to restart the lifecycle with fresh coordinates or rects

## Built-in Middleware

### `offset`

Adds a gap along the main axis.

```ts
offset(8);
offset({ mainAxis: 8, crossAxis: 4 });
offset((state) => ({ mainAxis: state.placement.startsWith('top') ? 12 : 8 }));
```

### `flip`

Preserves the preferred placement until it no longer fits, then tries a fallback placement.

```ts
middleware: [flip({ fallbackPlacements: ['right', 'left'] })];
```

### `autoPlacement`

Chooses the placement with the most usable space instead of preserving a preferred side.

```ts
middleware: [autoPlacement({ allowedPlacements: ['top', 'bottom'] })];
```

Do not combine `autoPlacement()` with `flip()`.

### `shift`

Keeps the floating element inside the boundary.

```ts
middleware: [shift({ padding: { top: 8, bottom: 16, left: 6, right: 6 } })];
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

### `arrow`

Produces coordinates for an arrow element.

```ts
const result = computePosition(reference, floating, {
  middleware: [arrow({ element: arrowEl, padding: 6 })],
});

const arrowData = result.middlewareData.arrow as { x?: number; y?: number } | undefined;
if (arrowData?.x != null) arrowEl.style.left = `${arrowData.x}px`;
if (arrowData?.y != null) arrowEl.style.top = `${arrowData.y}px`;
```

### `hide`

Reports whether the reference is clipped or the floating element has escaped.

```ts
const result = computePosition(reference, floating, {
  middleware: [hide()],
});

const hideData = result.middlewareData.hide as { escaped?: boolean; referenceHidden?: boolean } | undefined;
floating.style.visibility = hideData?.referenceHidden ? 'hidden' : 'visible';
```

### `inline`

Improves positioning for inline references spanning multiple lines.

```ts
middleware: [inline({ x: event.clientX, y: event.clientY })];
```

## Middleware Order

Recommended default order:

```ts
middleware: [
  offset(8),
  inline({ x: pointerX, y: pointerY }),
  flip(),
  autoPlacement(),
  shift({ padding: 6 }),
  size({ apply: ({ availableHeight }) => console.log(availableHeight) }),
  arrow({ element: arrowEl }),
  hide(),
];
```

Use either `flip()` or `autoPlacement()`, not both.

## Virtual References

All main positioning functions accept virtual references, which is useful for cursor-based context menus and text selections.

```ts
const cursorReference = {
  getBoundingClientRect: () => ({
    x: event.clientX,
    y: event.clientY,
    width: 0,
    height: 0,
  }),
};

const result = computePosition(cursorReference, menu, {
  middleware: [flip(), shift({ padding: 8 })],
});

menu.dataset.placement = result.placement;
```

## autoUpdate

`autoUpdate` is the lower-level primitive behind `float`.

```ts
const cleanup = autoUpdate(
  reference,
  floating,
  () => {
    const result = computePosition(reference, floating, {
      middleware: [offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl })],
    });

    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;
    floating.dataset.placement = result.placement;
  },
  {
    animationFrame: false,
    observeFloating: true,
  },
);
```

Use `animationFrame: true` when the reference itself animates between frames.

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { float, offset, flip, shift } from '@vielzeug/floatit';

function Tooltip({ anchor, children }: { anchor: HTMLElement | null; children: React.ReactNode }) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    const cleanup = float(anchor, tooltipRef.current, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    return () => cleanup();
  }, [anchor]);

  return <div ref={tooltipRef} role="tooltip" style={{ position: 'absolute' }}>{children}</div>;
}
```

```ts [Vue 3]
import { ref, watchEffect, onScopeDispose } from 'vue';
import { float, offset, flip, shift } from '@vielzeug/floatit';

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
  import { float, offset, flip, shift } from '@vielzeug/floatit';

  export let anchor: HTMLElement;

  let tooltipEl: HTMLDivElement;

  onMount(() => {
    const cleanup = float(anchor, tooltipEl, {
      placement: 'bottom',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    return () => cleanup();
  });
</script>

<div bind:this={tooltipEl} role="tooltip" style="position: absolute">
  <slot />
</div>
```

:::


### Pitfalls

- **React:** Passing `[open]` as the `useEffect` dependency re-runs `float()` every time visibility changes. This is correct — `float()` must be called after the tooltip is in the DOM.
- **Vue 3:** When using `v-if` to conditionally render the floating element, always `await nextTick()` before calling `float()` — otherwise `ref.value` is still `null`.
- **Svelte:** With `{#if}`, `bind:this` only resolves after the next microtask. Call `await tick()` before `float()` when toggling visibility.

## Working with Other Vielzeug Libraries

### With Craftit

Use Floatit inside a Craftit component to position tooltips and popovers reactively.

```ts
import { define, html, onMounted, ref } from '@vielzeug/craftit';
import { float, offset, flip, shift } from '@vielzeug/floatit';

define('x-tooltip', {
  setup() {
    const triggerRef = ref<HTMLElement>();
    const tooltipRef = ref<HTMLElement>();

    onMounted(() => {
      if (!triggerRef.value || !tooltipRef.value) return;
      return float(triggerRef.value, tooltipRef.value, {
        placement: 'bottom',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      });
    });

    return () => html`
      <button ref=${triggerRef}><slot></slot></button>
      <div ref=${tooltipRef} role="tooltip" style="position:absolute">
        <slot name="content"></slot>
      </div>
    `;
  },
});
```

## Best Practices

- Use `float()` for the common tooltip/popover case; use `computePosition()` when you need raw coordinates or custom rendering.
- Call the cleanup function returned by `float()` and `autoUpdate()` when the floating element is removed from the DOM.
- Use either `flip()` or `autoPlacement()` — combining them has no effect and increases overhead.
- Apply `offset()` before `flip()` or `autoPlacement()` in the middleware array so the flip logic accounts for the gap.
- Use `shift({ padding })` to keep the floating element away from viewport edges.
- Use virtual references for context menus and cursor-anchored popovers.
- Set `animationFrame: true` on `autoUpdate` only when the reference itself animates — it increases CPU usage.
