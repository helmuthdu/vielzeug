# OTP Input

A segmented one-time password input that renders individual cells for each digit. Auto-advances focus between cells, supports paste, Backspace navigation, and fires completion events.

## Basic Usage

```html
<ore-otp-input label="Verification code" color="primary"></ore-otp-input>
```

Listen for completion — use the `complete` event (not `change`) to trigger auto-submission after the last cell is filled. Always provide a `label` attribute to give context (e.g. `"Verification code"`).

```html
<ore-otp-input id="otp" label="Enter OTP" color="primary"></ore-otp-input>

<script type="module">
  import '@vielzeug/refine';

  document.getElementById('otp').addEventListener('complete', (e) => {
    console.log('OTP complete:', e.detail.value);
  });
</script>
```

## Length

Keep `length` at 4–8 cells — more cells increase cognitive load.

<ComponentPreview vertical>

```html
<ore-otp-input label="4-digit PIN" length="4" color="primary"></ore-otp-input>
<ore-otp-input label="6-digit OTP (default)" length="6" color="primary"></ore-otp-input>
<ore-otp-input label="8-digit code" length="8" color="primary"></ore-otp-input>
```

</ComponentPreview>

## Types

Avoid using `alphanumeric` for numeric-only codes (e.g. SMS OTPs) — `numeric` triggers the numeric keyboard on mobile.

<ComponentPreview vertical>

```html
<ore-otp-input label="Numeric (default)" type="numeric" color="primary"></ore-otp-input>
<ore-otp-input label="Alphanumeric" type="alphanumeric" color="secondary"></ore-otp-input>
```

</ComponentPreview>

## Masked Input

Use `masked` to hide the entered values. Always use `masked` for PINs and security codes to prevent shoulder-surfing.

<ComponentPreview center>

```html
<ore-otp-input label="PIN" masked color="primary"></ore-otp-input>
```

</ComponentPreview>

## With Separator

Use `separator` to add a visual divider between cells.

<ComponentPreview vertical>

```html
<ore-otp-input label="With separator (6 cells)" separator color="primary"></ore-otp-input>
<ore-otp-input label="Masked with separator" separator masked length="4" color="secondary"></ore-otp-input>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<ore-otp-input label="Small" size="sm" color="primary"></ore-otp-input>
<ore-otp-input label="Medium" size="md" color="primary"></ore-otp-input>
<ore-otp-input label="Large" size="lg" color="primary"></ore-otp-input>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<ore-otp-input color="primary"></ore-otp-input>
<ore-otp-input color="secondary"></ore-otp-input>
<ore-otp-input color="success"></ore-otp-input>
<ore-otp-input color="warning"></ore-otp-input>
<ore-otp-input color="error"></ore-otp-input>
```

</ComponentPreview>

## Variants

<ComponentPreview vertical>

```html
<ore-otp-input></ore-otp-input>
<ore-otp-input variant="flat"></ore-otp-input>
<ore-otp-input variant="bordered" color="primary"></ore-otp-input>
<ore-otp-input variant="outline"></ore-otp-input>
<ore-otp-input variant="ghost"></ore-otp-input>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<ore-otp-input label="Disabled" disabled value="123456" color="primary"></ore-otp-input>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default     | Description                                      |
| ----------- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| `length`    | `number`                                                                  | `6`         | Number of input cells                            |
| `type`      | `'numeric' \| 'alphanumeric'`                                             | `'numeric'` | Allowed character type                           |
| `value`     | `string`                                                                  | `''`        | Current value (string of all cells concatenated) |
| `masked`    | `boolean`                                                                 | `false`     | Render cells as hidden characters                |
| `separator` | `boolean`                                                                 | `false`     | Show a visual divider between cells              |
| `disabled`  | `boolean`                                                                 | `false`     | Disable all cells                                |
| `label`     | `string`                                                                  | —           | Accessible label for the group                   |
| `name`      | `string`                                                                  | —           | Form field name                                  |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —           | Focus ring / active cell color                   |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`      | Cell size                                        |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'`   | Visual style variant                             |

### Events

| Event      | Detail                                 | Description                           |
| ---------- | -------------------------------------- | ------------------------------------- |
| `change`   | `{ value: string, complete: boolean }` | Fired on every cell input             |
| `complete` | `{ value: string }`                    | Fired when all cells have been filled |

### CSS Custom Properties

| Property                        | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `--otp-cell-size`               | Width and height of each cell                  |
| `--otp-cell-gap`                | Gap between cells                              |
| `--otp-cell-font-size`          | Font size inside each cell                     |
| `--otp-cell-radius`             | Cell border radius                             |
| `--otp-cell-bg`                 | Cell background color                          |
| `--otp-cell-border-color`       | Default cell border color                      |
| `--otp-cell-focus-border`       | Focused border/caret color                     |
| `--otp-cell-hover-bg`           | Cell background on hover (flat/ghost variants) |
| `--otp-cell-hover-border-color` | Cell border on hover (flat/bordered variants)  |
| `--otp-cell-focus-bg`           | Cell background when focused (flat variant)    |
| `--otp-cell-focus-border-color` | Cell border when focused (flat variant)        |

## Accessibility

The OTP input component follows WCAG 2.1 Level AA standards. It renders as a `<fieldset>` with a `<legend>` derived from the `label` attribute, so always provide a `label` to ensure screen readers announce the group correctly. Each cell input has `autocomplete="one-time-code"` set automatically, and `aria-disabled` reflects the disabled state.

Keyboard navigation is fully supported: focus auto-advances to the next cell on valid input, `Backspace` moves back and clears the cell, `Tab` moves focus out of the group, and paste fills all cells at once.

Do not auto-submit without giving users a chance to review — show a confirmation step before sending.

## Related Components

- [Input](./input) — plain single-line input field
