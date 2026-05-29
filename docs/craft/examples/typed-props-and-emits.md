---
title: 'Craft Examples — Typed props and emits'
description: 'Current Craft example for typed prop signals and typed setup-context emit.'
---

## Typed props and emits

Combine direct prop definitions with the `Events` generic on `define<Props, Events>()` when you want both prop and event contracts checked together.

```ts
import { define, html, prop } from '@vielzeug/craft';

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

    return () => html`
      ${() =>
        props.open.value
          ? html`
              <div :data-variant=${props.variant}>
                <span>${props.message}</span>
                <button @click=${close}>Close</button>
              </div>
            `
          : ''}
    `;
  },
});
```

## Notes

- For no-detail events, use `void` so `emit('close')` stays ergonomic.
- `prop.oneOf(...)` should use `as const` or the type widens to `string`.
- Prop values in `setup()` are writable signals, so updates like `props.open.value = false` are valid.

### Related

- [Prop helpers and raw PropsDef](./propsof-builder-api.md)
- [Counter component](./counter-component.md)
- [Form-associated rating input](./form-associated-rating-input.md)
