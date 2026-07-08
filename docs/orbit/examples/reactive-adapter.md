---
title: Reactive Adapter
description: Use the @vielzeug/orbit/reactive adapter to drive tooltip positioning with ripple signals.
---

## Reactive Adapter

### Problem

You need tooltip/popover positioning to drive reactive UI updates — but `float()` uses an `apply` callback, not a signal. Manually wiring `apply` into your signal graph creates boilerplate.

### Solution

Use `createFloatState()` from `@vielzeug/orbit/reactive`. It wraps `float()` and exposes position as a Ripple `Readable<ComputePositionResult | null>`:

#### Basic Usage

```ts
import { effect } from '@vielzeug/ripple';
import { flip, offset, shift } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

const handle = createFloatState(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Apply styles whenever position changes
effect(() => {
  const pos = handle.position.value;
  if (!pos) return;
  tooltip.style.left = `${pos.x}px`;
  tooltip.style.top = `${pos.y}px`;
  tooltip.dataset.placement = pos.placement;
});

// Teardown
function onHide() {
  handle.dispose();
}
```

`handle.position` is `null` on creation. It becomes a `ComputePositionResult` after the first update and tracks every subsequent repositioning.

#### In a Ore Component

```ts
import { effect, signal } from '@vielzeug/ripple';
import { define, getHost, html, onMounted, prop } from '@vielzeug/ore';
import { flip, offset, shift } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';

define('my-tooltip', {
  props: { text: prop.string('') },
  setup(props) {
    const el = getHost();
    const visible = signal(false);

    onMounted(() => {
      const tooltipEl = el.querySelector<HTMLElement>('[role=tooltip]')!;
      const floatHandle = createFloatState(el, tooltipEl, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 6 })],
        autoUpdate: { pauseWhenHidden: true },
      });

      const stopEffect = effect(() => {
        const pos = floatHandle.position.value;
        if (!pos || !visible.value) return;
        tooltipEl.style.left = `${pos.x}px`;
        tooltipEl.style.top = `${pos.y}px`;
      });

      return () => {
        stopEffect();
        floatHandle.dispose();
      };
    });

    return html`<slot></slot><div role="tooltip" style="position: fixed">${props.text}</div>`;
  },
});
```

#### Accessing Middleware Data

All middleware data is available through the signal:

```ts
import type { FlipData, ShiftData } from '@vielzeug/orbit';
import { createFloatState } from '@vielzeug/orbit/reactive';
import { effect } from '@vielzeug/ripple';

const handle = createFloatState(ref, floating, {
  middleware: [flip(), shift()],
});

effect(() => {
  const pos = handle.position.value;
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

### Pitfalls

- **`position` is `null` before first update** — always guard `if (!pos) return` in effects.
- **Must call `handle.dispose()` on teardown** — forgetting it leaks the `autoUpdate` observer.
- **For CSS Anchor Positioning, use `floatWithAnchor()` directly** — `createFloatState` is for JS-computed reactive positioning only.

### Related

- [Orbit API Reference](/orbit/api.md)
- [SSR Setup](./ssr-setup.md)
- [Using Presets](./using-presets.md)
