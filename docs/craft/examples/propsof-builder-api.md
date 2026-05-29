---
title: 'Craft Examples — Prop helpers and raw PropsDef'
description: 'Prop helpers and raw PropsDef example for @vielzeug/craft.'
---

## Prop helpers and raw PropsDef

### Problem

You need to define typed component props with sensible defaults, attribute reflection, and custom parsing. Craft provides both convenience helpers and a raw escape hatch.

### Solution

Use `prop.*` for the common cases and raw `PropDef` objects when you need custom parsing or `reflect: false`.

```ts
import { define, html, prop } from '@vielzeug/craft';

define('x-button', {
  props: {
    label: prop.string('Button'),
    disabled: prop.bool(false),
    count: prop.number(0),
    size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
    variant: prop.oneOf(['solid', 'outline'] as const, 'solid'),
  },
  setup(props) {
    return html`
      <button ?disabled=${props.disabled} :data-size=${props.size} :data-variant=${props.variant}>
        ${() => (props.count.value > 0 ? html`<span class="badge">${props.count}</span>` : '')} ${props.label}
      </button>
    `;
  },
});
```

#### With raw `PropDef`

```ts
import { define, html } from '@vielzeug/craft';

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
    return html`<div>${props.internalState} at ${props.timestamp}</div>`;
  },
});
```

### Pitfalls

- Omitting `as const` on `prop.oneOf(...)` widens the union to `string`, which defeats the purpose of the constraint.
- `prop.json()` sets `reflect: false` by default because JSON serialization to attributes is expensive and rarely needed.
- Using `reflect: true` with large objects or arrays causes excessive attribute writes on every signal update.

### Related

- [Sieve — Validation](/sieve/) for validating prop values beyond type constraints
- [Typed props and emits](./typed-props-and-emits.md)
- [Counter component](./counter-component.md)
