---
title: 'Craftit Examples — Typed Props and Emits'
description: 'Typed Props and Emits examples for craftit using the defineProps + prop.* DSL.'
---

## Typed Props and Emits

## Problem

Implement typed props and events in a production-friendly way with `@vielzeug/craftit` using the `defineProps` + `prop.*` DSL and setup-context `emit`.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

type AlertBoxEvents = {
  close: void;
};

define<Record<string, never>, AlertBoxEvents>('alert-box', {
  props: defineProps({
    message: prop.string('Saved successfully'),
    open: prop.bool(true),
    variant: prop.oneOf(['primary', 'danger'] as const, 'primary'),
  }),
  setup(props, { emit }) {
    return {
      render: () => html`
        ${() =>
          props.open.value
            ? html`
                <div :data-variant=${props.variant.value}>
                  <span>${props.message}</span>
                  <button @click=${() => emit('close')}>Close</button>
                </div>
              `
            : ''}
      `,
    };
  },
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- Prop values are correctly parsed from HTML attributes.
- The `emit('close')` call is type-checked: no detail required since the payload is `void`.

## Common Pitfalls

- Forgetting `as const` on `prop.oneOf` arrays makes the type `string` instead of the union you want.
- For no-detail events, prefer `void` payload types so calls stay ergonomic (`emit('close')`).
- Host binding values must be signals or primitives — use `computed(...)` when you need a derived reactive value in a binding.

## Related Recipes

- [Props DSL](./propsof-builder-api.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
