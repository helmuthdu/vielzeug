---
title: 'Craftit Examples — Typed Props and Emits'
description: 'Typed Props and Emits examples for craftit.'
---

## Typed Props and Emits

## Problem

Implement typed props and emits in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { defineComponent, html, typed } from '@vielzeug/craftit';

type Variant = 'primary' | 'danger';

defineComponent<
  { message: string; open: boolean; variant: Variant },
  { close: void }
>({
  props: {
    message: { default: 'Saved successfully' },
    open: { default: true },
    variant: typed<Variant>('primary'),
  },
  setup({ emit, props }) {
    return html`
      ${() =>
        props.open.value
          ? html`
              <div :data-variant=${props.variant}>
                <span>${props.message}</span>
                <button @click=${() => emit('close')}>Close</button>
              </div>
            `
          : ''}
    `;
  },
  tag: 'alert-box',
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.
- For no-detail events, prefer `void` payload types so calls stay ergonomic (`emit('close')`).

## Related Recipes

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
