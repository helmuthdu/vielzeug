---
title: 'Orbit Examples — With Ore Component'
description: 'With Ore Component example for @vielzeug/orbit.'
---

## With Ore Component

### Problem

You are adding a positioned tooltip or popover to a Ore custom element. The float's `autoUpdate` cleanup must be tied to the component's own `disconnectedCallback` so it does not outlive the element.

### Solution

Usage inside a [@vielzeug/ore](/ore/) component with automatic `autoUpdate` cleanup.

```ts
import { autoUpdate, computePosition, flip, offset, shift } from '@vielzeug/orbit';
import { signal } from '@vielzeug/ripple';
import { define, getHost, html, onMounted } from '@vielzeug/ore';

define('my-tooltip', {
  setup(_props) {
    const el = getHost();
    const visible = signal(false);
    let tooltipEl: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    function update() {
      if (!tooltipEl) return;
      const result = computePosition(el, tooltipEl, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 6 })],
      });

      tooltipEl.style.left = `${result.x}px`;
      tooltipEl.style.top = `${result.y}px`;
    }

    onMounted(() => {
      tooltipEl = el.querySelector<HTMLElement>('[role=tooltip]');

      el.addEventListener('mouseenter', () => {
        visible.value = true;
        cleanup = autoUpdate(el, tooltipEl!, update);
      });
      el.addEventListener('mouseleave', () => {
        visible.value = false;
        cleanup?.();
        cleanup = null;
      });

      // Returned from onMounted — Ore calls this on disconnect
      return () => cleanup?.();
    });

    return html`<slot></slot><div role="tooltip" style="position: fixed"><slot name="content"></slot></div>`;
  },
});
```

### Pitfalls

- `autoUpdate` must be called after the Ore element's shadow DOM is ready — inside `onMounted`, not the constructor. The floating element reference may not exist before that point.
- Store the `autoUpdate` cleanup function in a local variable and return a cleanup closure from `onMounted` — Ore calls it automatically on disconnect.
- The floating element must have `position: fixed` or `position: absolute`. Without explicit CSS positioning, the computed `top`/`left` values are applied but have no visual effect.
- Ore does not re-export `@vielzeug/ripple` primitives — `signal`/`effect`/`computed` come from `@vielzeug/ripple`. Lifecycle hooks (`onMounted`, `onCleanup`, …) and `getHost()` are plain functions imported from `@vielzeug/ore` and called directly during `setup()`.

### Related

- [Web Component with Ore (Dnd)](@vielzeug/dnd/examples/web-component-with-craft)

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
