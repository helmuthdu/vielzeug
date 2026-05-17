---
title: 'Craftit Examples — Form-Associated Rating Input'
description: 'Form-Associated Rating Input example using defineField with a writable signal.'
---

## Form-Associated Rating Input

### Problem

Implement a form-associated rating input using `defineField` with a `signal` for two-way form binding.

### Solution

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define('rating-input', {
  formAssociated: true,
  setup() {
    const value = signal(0);

    // Pass the writable signal directly — defineField accepts Signal<T> or ReadonlySignal<T>.
    // A default toFormValue is applied: String(v) for primitives, null for null/undefined.
    const field = defineField({ value });

    return () => html`
      <button @click=${() => (value.value = 1)}>1</button>
      <button @click=${() => (value.value = 2)}>2</button>
      <button @click=${() => (value.value = 3)}>3</button>
      <button @click=${() => field.reportValidity()}>Validate</button>
      <p>Current: ${value}</p>
    `;
  },
});
```

### With custom serialisation

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define<{ disabled?: boolean }>('rating-input-v2', {
  formAssociated: true,
  props: { disabled: false },
  setup(props) {
    const value = signal<number[]>([]);

    const field = defineField({
      disabled: props.disabled,
      value,
      toFormValue: (v) => v.join(','),
    });

    return () => html`
      <button
        ?disabled=${props.disabled}
        @click=${() => field.setCustomValidity(value.value.length === 0 ? 'Please select a rating' : '')}>
        Validate
      </button>
    `;
  },
});
```
