# Form

A smart `<form>` wrapper that propagates `disabled`, `size`, `variant`, and `validateOn` context to all child `ore-*` form fields. Intercepts native submit/reset events and assembles `FormData` so you never wire up individual field listeners.

## Uniform Styling

Set `size` and `variant` once on `ore-form` to propagate them to all child fields.

<ComponentPreview vertical>

```html
<ore-form size="sm" variant="flat">
  <ore-input name="name" label="Full Name"></ore-input>
  <ore-input name="email" label="Email" type="email"></ore-input>
  <ore-combobox name="hobby" label="Hobby">
    <ore-combobox-option value="boardgame">Board Game</ore-combobox-option>
    <ore-combobox-option value="videogame">Video Game</ore-combobox-option>
    <ore-combobox-option value="playmusic">Play Music</ore-combobox-option>
    <ore-combobox-option value="gym">Gym</ore-combobox-option>
  </ore-combobox>
  <ore-select name="country" label="Country">
    <option value="br">Brazil</option>
    <option value="de">Germany</option>
    <option value="us">United States</option>
  </ore-select>
  <ore-button type="submit" size="sm">Submit</ore-button>
</ore-form>
```

</ComponentPreview>

## Bulk Disable

Set `disabled` to freeze all child fields and buttons — useful during an async submit request to prevent double-submission.

<ComponentPreview vertical>

```html
<ore-form id="async-form">
  <ore-input name="email" label="Email" type="email"></ore-input>
  <ore-button type="submit">Submit</ore-button>
</ore-form>
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

Use `validate-on` to control when field-level validation feedback appears. For long forms, `validate-on="blur"` gives users early feedback without interrupting them as they type.

| Value              | Behaviour                                             |
| ------------------ | ----------------------------------------------------- |
| `submit` (default) | Validate only when the form is submitted              |
| `blur`             | Validate each field as soon as it loses focus         |
| `change`           | Validate on every value change for immediate feedback |

```html
<!-- immediate feedback as the user types -->
<ore-form validate-on="change">
  <ore-input name="email" type="email" label="Email" required></ore-input>
  <ore-button type="submit">Continue</ore-button>
</ore-form>
```

## Layout: Horizontal

Set `orientation="horizontal"` to arrange fields in a flex row with wrapping.

<ComponentPreview vertical>

```html
<ore-form orientation="horizontal" variant="flat">
  <ore-input name="first" label="First Name"></ore-input>
  <ore-input name="last" label="Last Name"></ore-input>
  <ore-select name="role" label="Role">
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
  </ore-select>
  <ore-button type="submit">Save</ore-button>
</ore-form>
```

</ComponentPreview>

## Handling Submit

The `submit` event exposes `formData` and the original `SubmitEvent`. Always listen to the custom `submit` event emitted by `ore-form` rather than the native submit event directly — `formData` is already assembled for you.

```js
document.querySelector('ore-form').addEventListener('submit', (e) => {
  const data = e.detail.formData;
  console.log('email:', data.get('email'));
  console.log('role:', data.get('role'));
  console.log('submitter:', e.detail.originalEvent.submitter);
});
```

## Handling Reset

```js
document.querySelector('ore-form').addEventListener('reset', (e) => {
  console.log('Form was reset', e.detail.originalEvent);
});
```

## No-Validate Mode

Add `novalidate` to suppress native browser validation popups. Pair with `error` attributes on individual fields for custom validation UX.

```html
<ore-form novalidate>
  <ore-input name="email" label="Email" type="email" required error="Please enter a valid email address."> </ore-input>
  <ore-button type="submit">Submit</ore-button>
</ore-form>
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

| Slot      | Description                                                           |
| --------- | --------------------------------------------------------------------- |
| (default) | Form content — `ore-input`, `ore-select`, `ore-button`, and other fields |

### Events

| Event    | Detail                                               | Description                                                       |
| -------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `submit` | `{ formData: FormData, originalEvent: SubmitEvent }` | Fired on form submit. `formData` includes all named field values. |
| `reset`  | `{ originalEvent: Event }`                           | Fired when the form is reset.                                     |

### CSS Custom Properties

| Property     | Description                   | Default         |
| ------------ | ----------------------------- | --------------- |
| `--form-gap` | Gap between form control rows | `var(--size-4)` |

### Context Provided

`ore-form` provides a `FORM_CTX` context object consumed by all descendant `ore-*` form fields:

| Key          | Type                                                    | Description                           |
| ------------ | ------------------------------------------------------- | ------------------------------------- |
| `disabled`   | `{ readonly value: boolean }`                           | Whether all fields should be disabled |
| `size`       | `{ readonly value: 'sm' \| 'md' \| 'lg' \| undefined }` | Default size for all fields           |
| `variant`    | `{ readonly value: VisualVariant \| undefined }`        | Default variant for all fields        |
| `validateOn` | `{ readonly value: 'submit' \| 'blur' \| 'change' }`    | When validation should trigger        |

## Accessibility

`ore-form` follows WCAG 2.1 Level AA standards. It renders a native `<form>` in the shadow root, preserving semantic form behaviour. `Tab` navigates between child form fields. `aria-disabled` reflects the disabled state on the `<form>`. Each child field manages its own `aria-labelledby`, `aria-describedby`, and `aria-errormessage` independently. Use `novalidate` with explicit `error` attributes on fields to avoid conflicting browser validation popups.
