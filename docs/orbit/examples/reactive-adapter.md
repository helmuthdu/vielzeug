---
title: Reactive Adapter
description: Use the @vielzeug/orbit/reactive adapter to drive tooltip positioning with ripple signals.
---

# Reactive Adapter

The `@vielzeug/orbit/reactive` sub-path wraps `float()` and exposes the position as a `@vielzeug/ripple` `Signal`. This lets you consume position changes reactively in any code that reads `Signal.value`.

## Basic Usage

```ts
import { effect } from '@vielzeug/ripple';
import { flip, offset, shift } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

const { position, cleanup } = createFloatState(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Apply styles whenever position changes
effect(() => {
  const pos = position.value;
  if (!pos) return;
  tooltip.style.left = `${pos.x}px`;
  tooltip.style.top = `${pos.y}px`;
  tooltip.dataset.placement = pos.placement;
});

// Teardown
function onHide() {
  cleanup();
}
```

`position` is `null` on creation. It becomes a `ComputePositionResult` after the first update and tracks every subsequent repositioning.

## With CSS Anchor Positioning

When `preferCssAnchor: true` is passed and the browser supports it, `position` will remain `null` permanently — CSS handles it instead of JS. Use `cssAnchor` to branch accordingly:

```ts
const { position, cssAnchor, cleanup } = createFloatState(trigger, tooltip, {
  placement: 'top',
  preferCssAnchor: true,
});

if (!cssAnchor) {
  effect(() => {
    const pos = position.value;
    if (!pos) return;
    tooltip.style.left = `${pos.x}px`;
    tooltip.style.top = `${pos.y}px`;
  });
}
```

## In a Craft Component

```ts
import { computed, effect, signal } from '@vielzeug/ripple';
import { define, onMount } from '@vielzeug/craft';
import { flip, offset, shift } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';

define('my-tooltip', {
  props: ['text'],
  setup({ host, props }) {
    const visible = signal(false);

    onMount(() => {
      const tooltipEl = host.el.querySelector<HTMLElement>('[role=tooltip]')!;
      const { position, cleanup } = createFloatState(host.el, tooltipEl, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 6 })],
        autoUpdate: { pauseWhenHidden: true },
      });

      const stopEffect = effect(() => {
        const pos = position.value;
        if (!pos || !visible.value) return;
        tooltipEl.style.left = `${pos.x}px`;
        tooltipEl.style.top = `${pos.y}px`;
      });

      return () => {
        stopEffect();
        cleanup();
      };
    });
  },
});
```

## Accessing Middleware Data

All middleware data is available through the signal:

```ts
import type { FlipData, ShiftData } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';
import { effect } from '@vielzeug/ripple';

const { position, cleanup } = createFloatState(ref, floating, {
  middleware: [flip(), shift()],
});

effect(() => {
  const pos = position.value;
  if (!pos) return;

  const flip = pos.middlewareData.flip as FlipData | undefined;
  if (flip?.skippedPlacements.length) {
    console.log('Skipped:', flip.skippedPlacements);
  }

  const shift = pos.middlewareData.shift as ShiftData | undefined;
  if (shift) {
    console.log('Shifted by:', shift.x, shift.y);
  }
});
```
