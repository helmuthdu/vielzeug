---
title: 'Craftit Examples — Typed Props and Emits'
description: 'Typed Props and Emits examples for craftit.'
---

## Typed Props and Emits

## Problem

Implement typed props and events in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { component, define, html } from '@vielzeug/craftit';

type AlertBoxProps = {
  message?: string;
  open?: boolean;
  variant?: 'primary' | 'danger';
};

type AlertBoxEvents = {
  close: void;
};

define(
  'alert-box',
  component<AlertBoxProps, AlertBoxEvents>({
    props: {
      message: 'Saved successfully',
      open: true,
      variant: 'primary',
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
  }),
);
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
