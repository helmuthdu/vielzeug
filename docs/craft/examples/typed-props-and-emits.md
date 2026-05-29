---
title: 'Craft Examples — Typed props and emits'
description: 'Typed props and emits example for @vielzeug/craft.'
---

## Typed props and emits

### Problem

You need both prop and event contracts checked at the type level. Craft's `define<Props, Events>()` generic ensures prop shapes and emitted event payloads are fully typed.

### Solution

Combine `prop.*` helpers with the `Events` type parameter on `define()`.

```ts
import { define, html, prop, when } from '@vielzeug/craft';

type AlertBoxProps = {
  message: string;
  open: boolean;
  variant: 'primary' | 'danger';
};

type AlertBoxEvents = {
  close: void;
  change: { open: boolean };
};

define<AlertBoxProps, AlertBoxEvents>('alert-box', {
  props: {
    message: prop.string('Saved successfully'),
    open: prop.bool(true),
    variant: prop.oneOf(['primary', 'danger'] as const, 'primary'),
  },
  setup(props, { emit }) {
    const close = () => {
      if (!props.open.value) return;

      props.open.value = false;
      emit('change', { open: props.open.value });
      emit('close');
    };

    return html`
      ${when(
        () => props.open.value,
        () => html`
          <div :data-variant=${props.variant}>
            <span>${props.message}</span>
            <button @click=${close}>Close</button>
          </div>
        `,
      )}
    `;
  },
});
```

### Pitfalls

- Omitting `as const` on `prop.oneOf(...)` widens the type to `string`, losing the union constraint.
- Prop values in `setup()` are writable signals. Mutating `props.open.value = false` works but only updates local state — it does not reflect back to the parent's attribute unless `reflect: true` is set (the default for `prop.bool`).

### Related

- [Block — Accessible components](/block/) built with typed props using these same patterns
- [Prop helpers and raw PropsDef](./propsof-builder-api.md)
- [Counter component](./counter-component.md)
