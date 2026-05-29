---
title: 'Craft Examples — Observers in onMounted()'
description: 'Current Craft observer example using onMounted() and explicit DOM refs.'
---

## Observers in onMounted()

Observer helpers from `@vielzeug/craft/observers` require real DOM nodes, so call them in `onMounted()` after refs have resolved.

```ts
import { define, effect, html, onMounted, ref } from '@vielzeug/craft';
import { mediaObserver, resizeObserver } from '@vielzeug/craft/observers';

define('observed-panel', {
  setup() {
    const panel = ref<HTMLDivElement>();

    onMounted(() => {
      const element = panel.value;

      if (!element) return;

      const size = resizeObserver(element);
      const dark = mediaObserver('(prefers-color-scheme: dark)');

      effect(() => {
        console.log('panel width', size.value.width, 'dark mode', dark.value);
      });
    });

    return () => html`<div ref=${panel}>Resize me</div>`;
  },
});
```

## Notes

- Do not call these observer helpers before the target element exists.
- `resizeObserver()` and `intersectionObserver()` need an actual element, not a nullable ref.
- `mediaObserver()` is DOM-only as well because it uses `window.matchMedia`.

### Related

- [Context provider and consumer](./context-provider-and-consumer.md)
- [Counter component](./counter-component.md)
- [Form-associated rating input](./form-associated-rating-input.md)
