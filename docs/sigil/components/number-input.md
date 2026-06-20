# Number Input

A numeric text field with increment (＋) and decrement (−) spin-buttons. Enforces `min`/`max` bounds, supports configurable step sizes, and integrates with HTML forms.

## Min / Max / Step

<ComponentPreview center>

```html
<sg-number-input label="0–10, step 1" min="0" max="10" step="1" value="5"></sg-number-input>
<sg-number-input label="0–100, step 10" min="0" max="100" step="10" value="50"></sg-number-input>
<sg-number-input label="0.0–1.0, step 0.1" min="0" max="1" step="0.1" value="0.5"></sg-number-input>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<sg-number-input label="Small" size="sm" value="1"></sg-number-input>
<sg-number-input label="Medium" size="md" value="1"></sg-number-input>
<sg-number-input label="Large" size="lg" value="1"></sg-number-input>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<sg-number-input color="primary" value="1"></sg-number-input>
<sg-number-input color="secondary" value="1"></sg-number-input>
<sg-number-input color="success" value="1"></sg-number-input>
<sg-number-input color="error" value="1"></sg-number-input>
```

</ComponentPreview>

## Variants

<ComponentPreview center>

```html
<sg-number-input value="5"></sg-number-input>
<sg-number-input variant="flat" value="5"></sg-number-input>
<sg-number-input variant="bordered" value="5" color="primary"></sg-number-input>
<sg-number-input variant="outline" value="5"></sg-number-input>
<sg-number-input variant="ghost" value="5"></sg-number-input>
```

</ComponentPreview>

## Disabled & Readonly

<ComponentPreview center>

```html
<sg-number-input label="Disabled" value="5" disabled></sg-number-input>
<sg-number-input label="Readonly" value="5" readonly></sg-number-input>
```

</ComponentPreview>

## Outside Label

Set `label-placement="outside"` to render the label outside the control box, above the value.

<ComponentPreview center>

```html
<sg-number-input label="Quantity" label-placement="outside" value="1" min="0" max="99"></sg-number-input>
<sg-number-input label="Quantity" label-placement="outside" variant="flat" value="1" min="0" max="99"></sg-number-input>
<sg-number-input
  label="Quantity"
  label-placement="outside"
  variant="bordered"
  color="primary"
  value="1"
  min="0"
  max="99"></sg-number-input>
```

</ComponentPreview>

## Full Width

Add the `fullwidth` attribute to stretch the control to its container width.

<ComponentPreview>

```html
<sg-number-input label="Full Width" fullwidth value="1" min="0" max="99"></sg-number-input>
<sg-number-input
  label="Inset + Full Width"
  label-placement="inset"
  fullwidth
  value="1"
  min="0"
  max="99"></sg-number-input>
```

</ComponentPreview>

## Handling Change Events

```html
<sg-number-input id="qty" label="Quantity" value="1" min="1" max="99"></sg-number-input>

<script type="module">
  import '@vielzeug/sigil';

  document.getElementById('qty').addEventListener('change', (e) => {
    console.log('Value changed to:', e.detail.value);
  });
</script>
```

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

Keyboard navigation uses `↑` / `↓` to step the value by `step`, and `Page Up` / `Page Down` to step by `large-step`. `Tab` moves focus in and out of the control.

The label is linked via `aria-labelledby`, and helper or error text is linked via `aria-describedby`. Spin buttons carry `aria-label` values ("Increment" / "Decrement") and set `aria-disabled` when the value reaches `min` or `max`. The `aria-invalid` attribute reflects the error state, while `aria-disabled` and `aria-readonly` reflect the disabled and readonly states respectively.

## Related Components

- [Input](./input) — plain text / single-line input field
- [Slider](./slider) — drag-based numeric value picker
