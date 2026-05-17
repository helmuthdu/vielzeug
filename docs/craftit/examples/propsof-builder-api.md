---
title: 'Craftit Examples — Prop helpers and raw PropsDef'
description: 'Examples demonstrating current Craftit prop authoring with prop.* helpers and raw PropDef objects.'
---

## Prop helpers and raw PropsDef

Craftit defines props directly on the component. Use `prop.*` for the common cases and raw `PropDef` objects when you need custom parsing or `reflect: false`.

## Basic usage

```ts
import { define, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: {
    label: prop.string('Button'),
    disabled: prop.bool(false),
    count: prop.number(0),
    size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
    variant: prop.oneOf(['solid', 'outline'] as const, 'solid'),
  },
  setup(props) {
    return () => html`
      <button ?disabled=${props.disabled} :data-size=${props.size} :data-variant=${props.variant}>
        ${props.count.value > 0 ? html`<span class="badge">${props.count}</span>` : ''} ${props.label}
      </button>
    `;
  },
});
```

## With raw `PropDef`

```ts
import { define, html } from '@vielzeug/craftit';

define<{
  data?: string;
  timestamp?: number;
  internalState?: number;
}>('x-data-component', {
  props: {
    data: { default: '', reflect: false },
    timestamp: {
      default: 0,
      parse: (value) => (value == null ? 0 : Number(value)),
      reflect: true,
    },
    internalState: { default: 0, reflect: false },
  },
  setup(props) {
    return () => html`<div>${props.internalState} at ${props.timestamp}</div>`;
  },
});
```

## Common notes

- `prop.oneOf(...)` should use `as const` so the union stays narrow.
- Helper props reflect to attributes by default.
- Use `reflect: false` when the value is internal-only or not serializable.
- Use a custom `parse` function when HTML attribute values need non-default coercion.

### Related

- [Typed props and emits](./typed-props-and-emits.md)
- [Counter component](./counter-component.md)
- [Form-associated rating input](./form-associated-rating-input.md)
