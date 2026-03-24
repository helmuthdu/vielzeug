---
title: 'Craftit Examples — Observers in `onMount`'
description: 'Observers in `onMount` examples for craftit.'
---

## Observers in `onMount`

## Problem

Implement observers in `onmount` in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { defineComponent, effect, html, onMount, observeMedia, observeResize, ref } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const panel = ref<HTMLDivElement>();

    onMount(() => {
      const size = observeResize(panel.value!);
      const dark = observeMedia('(prefers-color-scheme: dark)');

      effect(() => {
        console.log('panel width', size.value.width, 'dark mode', dark.value);
      });
    });

    return html`<div ref=${panel}>Resize me</div>`;
  },
  tag: 'observed-panel',
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
