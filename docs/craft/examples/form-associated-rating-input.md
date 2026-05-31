---
title: 'Craft Examples — Form-Associated Rating Input'
description: 'Form-Associated Rating Input example for @vielzeug/craft.'
---

## Form-Associated Rating Input

### Problem

You need a custom form control that participates in native form submission, validation, and reset — without building the form internals plumbing yourself.

### Solution

Use `defineField()` with `formAssociated: true` to wire a signal to the element's form internals.

```ts
import { define, defineField, html, signal } from '@vielzeug/craft';

define('rating-input', {
  formAssociated: true,
  setup() {
    const value = signal(0);
    const field = defineField({ value });

    return html`
      <button @click=${() => (value.value = 1)}>1</button>
      <button @click=${() => (value.value = 2)}>2</button>
      <button @click=${() => (value.value = 3)}>3</button>
      <button @click=${() => field.reportValidity()}>Validate</button>
      <p>Current: ${value}</p>
    `;
  },
});
```

#### With custom serialisation

```ts
import { define, defineField, html, prop, signal } from '@vielzeug/craft';

define<{ disabled?: boolean }>('rating-input-v2', {
  formAssociated: true,
  props: { disabled: prop.bool(false) },
  setup(props) {
    const value = signal<number[]>([]);

    const field = defineField({
      disabled: props.disabled,
      value,
      toFormValue: (v) => v.join(','),
    });

    return html`
      <button
        ?disabled=${props.disabled}
        @click=${() => field.setCustomValidity(value.value.length === 0 ? 'Please select a rating' : '')}>
        Validate
      </button>
    `;
  },
});
```

### Pitfalls

- Forgetting `formAssociated: true` on the definition causes `defineField()` to fail silently — the element won't have `ElementInternals` attached.
- The default `toFormValue` stringifies primitives. For arrays or objects, provide a custom serializer to avoid `[object Object]` in form data.
- `reportValidity()` triggers the browser's native validation UI. Use `checkValidity()` for programmatic checks without user-visible tooltips.

### Related

- [Forge — Form state](/forge/) for coordinating multiple form-associated elements with shared validation
- [Typed props and emits](./typed-props-and-emits.md)
- [Counter component](./counter-component.md)
