---
title: 'Craftit Examples — Counter Component'
description: 'Counter Component examples for craftit.'
---

## Counter Component

## Problem

Implement counter component in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { defineComponent, html, signal } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const count = signal(0);

    return html`
      <div>
        <button @click=${() => count.value--}>-</button>
        <strong>${count}</strong>
        <button @click=${() => count.value++}>+</button>
      </div>
    `;
  },
  tag: 'simple-counter',
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
- [Form-Associated Rating Input](./form-associated-rating-input.md)
- [Observers in `onMount`](./observers-in-onmount.md)
