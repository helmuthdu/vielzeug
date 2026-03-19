---
title: 'Craftit Examples — Form-Associated Rating Input'
description: 'Form-Associated Rating Input examples for craftit.'
---

## Form-Associated Rating Input

## Problem

Implement form-associated rating input in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { defineComponent, defineField, html, signal } from '@vielzeug/craftit';

defineComponent({
  formAssociated: true,
  setup() {
    const value = signal(0);

    defineField({
      value,
      toFormValue: (v) => String(v),
    });

    return html`
      <button @click=${() => (value.value = 1)}>1</button>
      <button @click=${() => (value.value = 2)}>2</button>
      <button @click=${() => (value.value = 3)}>3</button>
      <p>Current: ${value}</p>
    `;
  },
  tag: 'rating-input',
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
- [Observers in `onMount`](./observers-in-onmount.md)
