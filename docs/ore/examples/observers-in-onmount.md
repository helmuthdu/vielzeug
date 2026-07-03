---
title: 'Ore Examples — Observers in onMounted()'
description: 'Observers in onMounted() example for @vielzeug/ore.'
---

## Observers in onMounted()

### Problem

You need to observe element size, intersection, or media queries, but the observer helpers require real DOM nodes that don't exist during `setup()`.

### Solution

Call observer helpers inside `onMounted()` after refs have resolved.

```ts
import { define, html, ref } from '@vielzeug/ore';
import { mediaObserver, resizeObserver } from '@vielzeug/ore/observers';

define('observed-panel', {
  setup(_props, { onMounted, watch }) {
    const panel = ref<HTMLDivElement>();

    onMounted(() => {
      const element = panel.value;

      if (!element) return;

      const size = resizeObserver(element);
      const dark = mediaObserver('(prefers-color-scheme: dark)');

      // watch() is the setup-context effect — auto-cleaned up on disconnect.
      watch(() => {
        console.log('panel width', size.value.width, 'dark mode', dark.value);
      });
    });

    return html`<div ref=${panel}>Resize me</div>`;
  },
});
```

### Pitfalls

- Calling `resizeObserver()` or `intersectionObserver()` before the element exists (outside `onMounted()`) will receive a null ref and observe nothing.
- `mediaObserver()` uses `window.matchMedia` internally — it fails silently in SSR environments without a DOM shim.

### Related

- [Ripple — Effects](/ripple/) for the reactive `effect()` used inside the observer callback
- [Context provider and consumer](./context-provider-and-consumer.md)
- [Counter component](./counter-component.md)
