---
title: 'Ore Examples — Form-Associated Rating Input'
description: 'Form-Associated Rating Input example for @vielzeug/ore.'
---

## Form-Associated Rating Input

### Problem

You need a custom form control that participates in native form submission, validation, and reset — without building the form internals plumbing yourself.

### Solution

Use `useField()` with `formAssociated: true` to wire a signal to the element's form internals.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';
import { useField } from '@vielzeug/ore/forms';

define('rating-input', {
  formAssociated: true,
  setup() {
    const value = signal(0);
    const field = useField({ value });

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
import { signal } from '@vielzeug/ripple';
import { define, html, prop } from '@vielzeug/ore';
import { useField } from '@vielzeug/ore/forms';

define<{ disabled?: boolean }>('rating-input-v2', {
  formAssociated: true,
  props: { disabled: prop.bool(false) },
  setup(props) {
    const value = signal<number[]>([]);

    const field = useField({
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

#### Required + reset

`validity`/`validationMessage` make a declared constraint (e.g. `required`) participate in native constraint validation — `checkValidity()`/`reportValidity()` and an ancestor `<form>`'s submit blocking all see it, not just `field.reportValidity()`. `onReset` restores local state when the ancestor `<form>` resets (native `formResetCallback`, not fired by jsdom without a test polyfill — see `packages/ore/vitest.setup.ts` for the reference shape).

```ts
import { signal, computed } from '@vielzeug/ripple';
import { define, html, prop } from '@vielzeug/ore';
import { useField } from '@vielzeug/ore/forms';

define<{ required?: boolean }>('rating-input-v3', {
  formAssociated: true,
  props: { required: prop.bool(false) },
  setup(props) {
    const initialValue = 0;
    const value = signal(initialValue);
    const isBlank = () => value.value === 0;

    const field = useField({
      onReset: () => (value.value = initialValue),
      validationMessage: computed(() => (props.required.value && isBlank() ? 'Please select a rating.' : '')),
      validity: computed(() => (props.required.value && isBlank() ? { valueMissing: true } : null)),
      value,
    });

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

### Pitfalls

- Forgetting `formAssociated: true` on the definition causes `useField()` to fail silently — the element won't have `ElementInternals` attached.
- The default `toFormValue` stringifies primitives. For arrays or objects, provide a custom serializer to avoid `[object Object]` in form data.
- `reportValidity()` triggers the browser's native validation UI. Use `checkValidity()` for programmatic checks without user-visible tooltips.
- `validity`/`validationMessage` are the only options that make a constraint visible to `<form>`-level submit blocking — `setCustomValidity()` alone does the same thing imperatively, but a reactive `validity` signal is usually less code for a constraint derived from props/state (like `required`).

### Related

- [Forge — Form state](/forge/) for coordinating multiple form-associated elements with shared validation
- [Typed props and emits](./typed-props-and-emits.md)
- [Counter component](./counter-component.md)
