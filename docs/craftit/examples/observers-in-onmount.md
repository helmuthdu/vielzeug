---
title: 'Craftit Examples — Observers in setup()'
description: 'Observer examples for craftit using setup() and explicit cleanup.'
---

## Observers in setup()

## Problem

Implement observers in setup in a production-friendly way with `@vielzeug/craftit/observers` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { define, effect, html, onCleanup, ref } from '@vielzeug/craftit';
import { mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

define(
  'observed-panel',
  {
    setup() {
      const panel = ref<HTMLDivElement>();
      const size = resizeObserver(panel);
      const dark = mediaObserver('(prefers-color-scheme: dark)');

      const stop = effect(() => {
        console.log('panel width', size.value.width, 'dark mode', dark.value);
      });

      onCleanup(stop);

      return html`<div ref=${panel}>Resize me</div>`;
    },
  },
);
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
