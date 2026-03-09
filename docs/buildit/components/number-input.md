# Number Input

A numeric text field with increment (＋) and decrement (−) spin-buttons. Enforces `min`/`max` bounds, supports configurable step sizes, and integrates with HTML forms.

## Features

- ⌨️ **Keyboard Navigation** — `↑`/`↓` arrows step by `step`; `Page Up`/`Page Down` step by `large-step`
- ➕➖ **Spin Buttons** — click or hold to increment / decrement
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 📏 **3 Sizes** — sm, md, lg
- 🔗 **Form-Associated** — `name` attribute & native form `reset` support
- 🔘 **Nullable Mode** — allows an empty / null state
- 🔢 **Min / Max Clamping** — values are automatically clamped to the configured range

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/number-input/number-input.ts
:::

## Basic Usage

```html
<bit-number-input label="Quantity" value="1" min="0" max="100"></bit-number-input>

<script type="module">
  import '@vielzeug/buildit';
</script>
```

## Min / Max / Step

<ComponentPreview center>

```html
<bit-number-input label="0–10, step 1" min="0" max="10" step="1" value="5"></bit-number-input>
<bit-number-input label="0–100, step 10" min="0" max="100" step="10" value="50"></bit-number-input>
<bit-number-input label="0.0–1.0, step 0.1" min="0" max="1" step="0.1" value="0.5"></bit-number-input>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<bit-number-input label="Small" size="sm" value="1"></bit-number-input>
<bit-number-input label="Medium" size="md" value="1"></bit-number-input>
<bit-number-input label="Large" size="lg" value="1"></bit-number-input>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<bit-number-input color="primary" value="1"></bit-number-input>
<bit-number-input color="secondary" value="1"></bit-number-input>
<bit-number-input color="success" value="1"></bit-number-input>
<bit-number-input color="error" value="1"></bit-number-input>
```

</ComponentPreview>

## Variants

<ComponentPreview center>

```html
<bit-number-input value="5"></bit-number-input>
<bit-number-input variant="flat" value="5"></bit-number-input>
<bit-number-input variant="bordered" value="5" color="primary"></bit-number-input>
<bit-number-input variant="outline" value="5"></bit-number-input>
<bit-number-input variant="ghost" value="5"></bit-number-input>
```

</ComponentPreview>

## Disabled & Readonly

<ComponentPreview center>

```html
<bit-number-input label="Disabled" value="5" disabled></bit-number-input>
<bit-number-input label="Readonly" value="5" readonly></bit-number-input>
```

</ComponentPreview>

## Outside Label

Set `label-placement="outside"` to render the label outside the control box, above the value.

<ComponentPreview center>

```html
<bit-number-input label="Quantity" label-placement="outside" value="1" min="0" max="99"></bit-number-input>
<bit-number-input
  label="Quantity"
  label-placement="outside"
  variant="flat"
  value="1"
  min="0"
  max="99"></bit-number-input>
<bit-number-input
  label="Quantity"
  label-placement="outside"
  variant="bordered"
  color="primary"
  value="1"
  min="0"
  max="99"></bit-number-input>
```

</ComponentPreview>

## Full Width

Add the `fullwidth` attribute to stretch the control to its container width.

<ComponentPreview>

```html
<bit-number-input label="Full Width" fullwidth value="1" min="0" max="99"></bit-number-input>
<bit-number-input
  label="Inset + Full Width"
  label-placement="inset"
  fullwidth
  value="1"
  min="0"
  max="99"></bit-number-input>
```

</ComponentPreview>

## Handling Change Events

```html
<bit-number-input id="qty" label="Quantity" value="1" min="1" max="99"></bit-number-input>

<script type="module">
  import '@vielzeug/buildit';

  document.getElementById('qty').addEventListener('change', (e) => {
    console.log('Value changed to:', e.detail.value);
  });
</script>
```

## Guideline Recipe: Clarify Constraints Upfront

**Guideline: clarify** — exposing `min`, `max`, and `step` as visible context removes the guesswork of what values are valid before the user starts typing.

```html
<!-- Seat count picker: make the valid range obvious -->
<bit-number-input
  label="Number of seats"
  name="seats"
  min="1"
  max="500"
  step="1"
  value="5"
  helper="Min 1 · Max 500 seats per workspace"></bit-number-input>
```

**Tip:** Use `helper` to restate the `min`/`max` range in plain language so users don't need to hit a validation error to discover the limits.

## API Reference

### Attributes

| Attribute         | Type                                                                      | Default     | Description                                |
| ----------------- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| `value`           | `number \| null`                                                          | `null`      | Current numeric value                      |
| `min`             | `number`                                                                  | —           | Minimum allowed value                      |
| `max`             | `number`                                                                  | —           | Maximum allowed value                      |
| `step`            | `number`                                                                  | `1`         | Increment / decrement step size            |
| `large-step`      | `number`                                                                  | `10`        | Step size for `Page Up` / `Page Down` keys |
| `label`           | `string`                                                                  | —           | Visible label text                         |
| `label-placement` | `'outside' \| 'inset'`                                                    | `'outside'` | Label above the control or inset inside it |
| `name`            | `string`                                                                  | —           | Form field name                            |
| `placeholder`     | `string`                                                                  | —           | Placeholder text when empty                |
| `nullable`        | `boolean`                                                                 | `false`     | Allow an empty / null value                |
| `disabled`        | `boolean`                                                                 | `false`     | Disables the control                       |
| `readonly`        | `boolean`                                                                 | `false`     | Prevents user edits                        |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —           | Focus ring and accent color                |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`      | Component size                             |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'`   | Visual style variant                       |
| `fullwidth`       | `boolean`                                                                 | `false`     | Stretch to the full width of the container |

### Events

| Event    | Detail                      | Description                                 |
| -------- | --------------------------- | ------------------------------------------- |
| `change` | `{ value: number \| null }` | Fired when value is committed (blur / step) |
| `input`  | `{ value: number \| null }` | Fired on every keystroke                    |

### CSS Custom Properties

| Property                      | Description                  |
| ----------------------------- | ---------------------------- |
| `--number-input-height`       | Control height               |
| `--number-input-border-color` | Border color                 |
| `--number-input-radius`       | Border radius                |
| `--number-input-bg`           | Input background             |
| `--number-input-btn-bg`       | Spin-button background       |
| `--number-input-btn-hover-bg` | Spin-button hover background |

## Accessibility

The number input component follows WCAG 2.1 Level AA standards.

### `bit-number-input`

✅ **Keyboard Navigation**

- `↑` / `↓` step the value by `step`; `Page Up` / `Page Down` step by `large-step`.
- `Tab` moves focus in and out.

✅ **Screen Readers**

- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- Spin buttons use `aria-label` ("Increment" / "Decrement") and `aria-disabled` when the value is at `min` / `max`.
- `aria-invalid` reflects the error state.
- `aria-disabled` and `aria-readonly` reflect the disabled and readonly states.

## Related Components

- [Input](./input) — plain text / single-line input field
- [Slider](./slider) — drag-based numeric value picker
