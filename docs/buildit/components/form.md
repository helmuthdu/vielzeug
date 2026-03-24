# Form

A smart `<form>` wrapper that propagates `disabled`, `size`, `variant`, and `validateOn` context to all child `bit-*` form fields. Intercepts native submit/reset events and assembles `FormData` so you never wire up individual field listeners.

## Features

- ↔️ **Layout Orientation** — `vertical` (default) or `horizontal` with automatic wrapping
- ✅ **Validation Strategy** — configure when validation runs: on `submit`, on `blur`, or on every `change`
- 🎨 **Uniform Styling** — set `variant` and `size` once instead of on every individual field
- 📡 **Context Propagation** — `disabled`, `size`, `variant`, and `validateOn` automatically apply to all child form fields
- 📤 **Submit / Reset Events** — intercepts native events and emits `submit` with `FormData` and `reset`
- 🔒 **Bulk Disable** — set `disabled` once to freeze every field while a submit request is in flight
- 🔗 **Native `<form>`** — renders a real `<form>` in the shadow DOM so submit buttons and `FormData` work correctly
- 🚫 **No-Validate Mode** — suppress native browser validation popups with `novalidate`

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/inputs/form/form.ts
:::

## Basic Usage

Wrap your form fields in `bit-form`. A `bit-button type="submit"` triggers the form submit event.

```html
<bit-form id="my-form">
  <bit-input name="email" label="Email" type="email" required></bit-input>
  <bit-select name="role" label="Role">
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
  </bit-select>
  <bit-button type="submit">Submit</bit-button>
</bit-form>

<script type="module">
  import '@vielzeug/buildit/form';
  import '@vielzeug/buildit/input';
  import '@vielzeug/buildit/select';
  import '@vielzeug/buildit/button';

  document.getElementById('my-form').addEventListener('submit', (e) => {
    console.log([...e.detail.formData.entries()]);
  });
</script>
```

## Uniform Styling

Set `size` and `variant` once on `bit-form` to propagate them to all child fields.

<ComponentPreview vertical>

```html
<bit-form size="sm" variant="flat">
  <bit-input name="name" label="Full Name"></bit-input>
  <bit-input name="email" label="Email" type="email"></bit-input>
  <bit-combobox name="hobby" label="Hobby">
    <bit-combobox-option value="boardgame">Board Game</bit-combobox-option>
    <bit-combobox-option value="videogame">Video Game</bit-combobox-option>
    <bit-combobox-option value="playmusic">Play Music</bit-combobox-option>
    <bit-combobox-option value="gym">Gym</bit-combobox-option>
  </bit-combobox>
  <bit-select name="country" label="Country">
    <option value="br">Brazil</option>
    <option value="de">Germany</option>
    <option value="us">United States</option>
  </bit-select>
  <bit-button type="submit" size="sm">Submit</bit-button>
</bit-form>
```

</ComponentPreview>

## Bulk Disable

Set `disabled` to freeze all child fields and buttons — useful during an async submit request to prevent double-submission.

<ComponentPreview vertical>

```html
<bit-form id="async-form">
  <bit-input name="email" label="Email" type="email"></bit-input>
  <bit-button type="submit">Submit</bit-button>
</bit-form>
```

</ComponentPreview>

```js
const form = document.getElementById('async-form');
form.addEventListener('submit', async (e) => {
  form.disabled = true;
  try {
    await fetch('/api/submit', { method: 'POST', body: e.detail.formData });
  } finally {
    form.disabled = false;
  }
});
```

## Validation Strategy

Use `validate-on` to control when field-level validation feedback appears.

| Value              | Behaviour                                             |
| ------------------ | ----------------------------------------------------- |
| `submit` (default) | Validate only when the form is submitted              |
| `blur`             | Validate each field as soon as it loses focus         |
| `change`           | Validate on every value change for immediate feedback |

```html
<!-- immediate feedback as the user types -->
<bit-form validate-on="change">
  <bit-input name="email" type="email" label="Email" required></bit-input>
  <bit-button type="submit">Continue</bit-button>
</bit-form>
```

## Layout: Horizontal

Set `orientation="horizontal"` to arrange fields in a flex row with wrapping.

<ComponentPreview vertical>

```html
<bit-form orientation="horizontal" variant="flat">
  <bit-input name="first" label="First Name"></bit-input>
  <bit-input name="last" label="Last Name"></bit-input>
  <bit-select name="role" label="Role">
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
  </bit-select>
  <bit-button type="submit">Save</bit-button>
</bit-form>
```

</ComponentPreview>

## Handling Submit

The `submit` event exposes `formData` and the original `SubmitEvent`.

```js
document.querySelector('bit-form').addEventListener('submit', (e) => {
  const data = e.detail.formData;
  console.log('email:', data.get('email'));
  console.log('role:', data.get('role'));
  console.log('submitter:', e.detail.originalEvent.submitter);
});
```

## Handling Reset

```js
document.querySelector('bit-form').addEventListener('reset', (e) => {
  console.log('Form was reset', e.detail.originalEvent);
});
```

## No-Validate Mode

Add `novalidate` to suppress native browser validation popups. Pair with `error` attributes on individual fields for custom validation UX.

```html
<bit-form novalidate>
  <bit-input name="email" label="Email" type="email" required error="Please enter a valid email address."> </bit-input>
  <bit-button type="submit">Submit</bit-button>
</bit-form>
```

## API Reference

### Attributes

| Attribute     | Type                                                      | Default      | Description                                      |
| ------------- | --------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `disabled`    | `boolean`                                                 | `false`      | Disable all child form fields                    |
| `size`        | `'sm' \| 'md' \| 'lg'`                                    | —            | Default size propagated to all child form fields |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'` | —            | Default visual variant for all child form fields |
| `orientation` | `'vertical' \| 'horizontal'`                              | `'vertical'` | Layout direction of child controls               |
| `novalidate`  | `boolean`                                                 | `false`      | Disable native browser validation popups         |
| `validate-on` | `'submit' \| 'blur' \| 'change'`                          | `'submit'`   | When child fields trigger validation feedback    |

### Slots

| Slot      | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| (default) | Form content — `bit-input`, `bit-select`, `bit-button`, and other fields |

### Events

| Event    | Detail                                               | Description                                                       |
| -------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `submit` | `{ formData: FormData, originalEvent: SubmitEvent }` | Fired on form submit. `formData` includes all named field values. |
| `reset`  | `{ originalEvent: Event }`                           | Fired when the form is reset.                                     |

### CSS Custom Properties

| Property     | Description                         | Default               |
| ------------ | ----------------------------------- | --------------------- |
| `--form-gap` | Spacing between child form controls | `var(--size-4, 1rem)` |

### Context Provided

`bit-form` provides a `FORM_CTX` context object consumed by all descendant `bit-*` form fields:

| Key          | Type                                                    | Description                           |
| ------------ | ------------------------------------------------------- | ------------------------------------- |
| `disabled`   | `{ readonly value: boolean }`                           | Whether all fields should be disabled |
| `size`       | `{ readonly value: 'sm' \| 'md' \| 'lg' \| undefined }` | Default size for all fields           |
| `variant`    | `{ readonly value: VisualVariant \| undefined }`        | Default variant for all fields        |
| `validateOn` | `{ readonly value: 'submit' \| 'blur' \| 'change' }`    | When validation should trigger        |

## Accessibility

The form component follows WCAG 2.1 Level AA standards.

### `bit-form`

✅ **Keyboard Navigation**

- `Tab` navigates between child form fields.

✅ **Screen Readers**

- Renders a native `<form>` in the shadow root, preserving semantic form behaviour.
- `aria-disabled` reflects the disabled state on the `<form>`.
- Each child field manages its own `aria-labelledby`, `aria-describedby`, and `aria-errormessage` independently.
- Use `novalidate` with explicit `error` attributes on fields to avoid conflicting browser validation popups.

## Best Practices

**Do:**

- Use `bit-form` whenever multiple fields share the same `size` or `variant`.
- Toggle `disabled` during async operations to prevent double-submission.
- Listen to the `submit` event on `bit-form` — `formData` is already assembled for you.
- Use `validate-on="blur"` for long forms to give users early feedback without interrupting them as they type.

**Don't:**

- Nest `bit-form` elements inside each other.
- Rely on the native `submit` event directly — always use the custom `submit` event emitted by `bit-form`.
- Use `bit-form` for single-field scenarios — a standalone field with its own listener is simpler.
