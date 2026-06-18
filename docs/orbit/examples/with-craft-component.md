---
title: 'Orbit Examples — With Craft Component'
description: 'With Craft Component example for @vielzeug/orbit.'
---

## With Craft Component

### Problem

You are adding a positioned tooltip or popover to a Craft custom element. The float's `autoUpdate` cleanup must be tied to the component's own `disconnectedCallback` so it does not outlive the element.

### Solution

Usage inside a [@vielzeug/craft](/craft/) component with automatic `autoUpdate` cleanup.

```ts
import { autoUpdate, computePosition, flip, offset, shift } from '@vielzeug/orbit';
import { define, onMount, signal } from '@vielzeug/craft';

define('my-tooltip', {
  setup({ host }) {
    const visible = signal(false);
    let tooltipEl: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    function update() {
      if (!tooltipEl) return;
      const result = computePosition(host.el, tooltipEl, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 6 })],
      });

      tooltipEl.style.left = `${result.x}px`;
      tooltipEl.style.top = `${result.y}px`;
    }

    onMount(() => {
      host.el.addEventListener('mouseenter', () => {
        visible.value = true;
        cleanup = autoUpdate(host.el, tooltipEl!, update);
      });
      host.el.addEventListener('mouseleave', () => {
        visible.value = false;
        cleanup?.();
        cleanup = null;
      });

      // Cleanup is run automatically on unmount by Craft
      return () => cleanup?.();
    });
  },
});
```

### Pitfalls

- `autoUpdate` must be called after the Craft element's shadow DOM is ready — inside `onMounted`, not the constructor. The floating element reference may not exist before that point.
- Store the `autoUpdate` cleanup function in a component property and call it in `disconnectedCallback`. Returning it from `onMounted` is the cleanest pattern for Craft.
- The floating element must have `position: fixed` or `position: absolute`. Without explicit CSS positioning, the computed `top`/`left` values are applied but have no visual effect.

### Related

- [Web Component with Craft (Dnd)](@vielzeug/dnd/examples/web-component-with-craft)

- [Context Menu](./context-menu.md)
- [Custom Middleware](./custom-middleware.md)
- [Dropdown / Select](./dropdown-select.md)
