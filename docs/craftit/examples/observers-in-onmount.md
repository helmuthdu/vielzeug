---
title: 'Craftit Examples — Observers in mount()'
description: 'Current Craftit observer example using mount() and explicit DOM refs.'
---

## Observers in mount()

Observer helpers from `@vielzeug/craftit/observers` require real DOM nodes, so call them in `mount()` after refs have resolved.

```ts
import { define, effect, html, ref } from '@vielzeug/craftit';
import { mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

define('observed-panel', {
  setup() {
    const panel = ref<HTMLDivElement>();

    return {
      mount() {
        const element = panel.value;

        if (!element) return;

        const size = resizeObserver(element);
        const dark = mediaObserver('(prefers-color-scheme: dark)');

        effect(() => {
          console.log('panel width', size.value.width, 'dark mode', dark.value);
        });
      },
      render: () => html`<div ref=${panel}>Resize me</div>`,
    };
  },
});
```

## Notes

- Do not call these observer helpers before the target element exists.
- `resizeObserver()` and `intersectionObserver()` need an actual element, not a nullable ref.
- `mediaObserver()` is DOM-only as well because it uses `window.matchMedia`.

## Related recipes

- [Context provider and consumer](./context-provider-and-consumer.md)
- [Counter component](./counter-component.md)
- [Form-associated rating input](./form-associated-rating-input.md)
