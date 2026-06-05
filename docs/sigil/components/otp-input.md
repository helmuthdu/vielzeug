# OTP Input

A segmented one-time password input that renders individual cells for each digit. Auto-advances focus between cells, supports paste, Backspace navigation, and fires completion events.

## Features

- ⌫ **Backspace Navigation** — moves focus backward and clears the cell
- ⏭️ **Auto-Advance** — focus moves to the next cell automatically on input
- ➗ **Optional Separator** — visual divider between cells
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 📋 **Paste Support** — pastes fill all cells at once
- 📏 **3 Sizes** — sm, md, lg
- 🔒 **Masked Mode** — renders `•` characters instead of input values
- 🔗 **Form-Associated** — `name` attribute & native form `reset` support
- 🔢 **Configurable Length** — any number of cells (default 6)
- 🔤 **Two Input Types** — `numeric` (digits only) or `alphanumeric`

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/otp-input/otp-input.ts
:::

## Basic Usage

```html
<sg-otp-input label="Verification code" color="primary"></sg-otp-input>

<script type="module">
  import '@vielzeug/sigil';
</script>
```

Listen for completion:

```html
<sg-otp-input id="otp" label="Enter OTP" color="primary"></sg-otp-input>

<script type="module">
  import '@vielzeug/sigil';

  document.getElementById('otp').addEventListener('complete', (e) => {
    console.log('OTP complete:', e.detail.value);
  });
</script>
```

## Length

<ComponentPreview vertical>

```html
<sg-otp-input label="4-digit PIN" length="4" color="primary"></sg-otp-input>
<sg-otp-input label="6-digit OTP (default)" length="6" color="primary"></sg-otp-input>
<sg-otp-input label="8-digit code" length="8" color="primary"></sg-otp-input>
```

</ComponentPreview>

## Types

<ComponentPreview vertical>

```html
<sg-otp-input label="Numeric (default)" type="numeric" color="primary"></sg-otp-input>
<sg-otp-input label="Alphanumeric" type="alphanumeric" color="secondary"></sg-otp-input>
```

</ComponentPreview>

## Masked Input

Use `masked` to hide the entered values (useful for PINs).

<ComponentPreview center>

```html
<sg-otp-input label="PIN" masked color="primary"></sg-otp-input>
```

</ComponentPreview>

## With Separator

Use `separator` to add a visual divider between cells.

<ComponentPreview vertical>

```html
<sg-otp-input label="With separator (6 cells)" separator color="primary"></sg-otp-input>
<sg-otp-input label="Masked with separator" separator masked length="4" color="secondary"></sg-otp-input>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<sg-otp-input label="Small" size="sm" color="primary"></sg-otp-input>
<sg-otp-input label="Medium" size="md" color="primary"></sg-otp-input>
<sg-otp-input label="Large" size="lg" color="primary"></sg-otp-input>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<sg-otp-input color="primary"></sg-otp-input>
<sg-otp-input color="secondary"></sg-otp-input>
<sg-otp-input color="success"></sg-otp-input>
<sg-otp-input color="warning"></sg-otp-input>
<sg-otp-input color="error"></sg-otp-input>
```

</ComponentPreview>

## Variants

<ComponentPreview vertical>

```html
<sg-otp-input></sg-otp-input>
<sg-otp-input variant="flat"></sg-otp-input>
<sg-otp-input variant="bordered" color="primary"></sg-otp-input>
<sg-otp-input variant="outline"></sg-otp-input>
<sg-otp-input variant="ghost"></sg-otp-input>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<sg-otp-input label="Disabled" disabled value="123456" color="primary"></sg-otp-input>
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

| Property                  | Description                    |
| ------------------------- | ------------------------------ |
| `--otp-cell-size`         | Width and height of each cell  |
| `--otp-cell-gap`          | Gap between cells              |
| `--otp-cell-font-size`    | Font size inside each cell     |
| `--otp-cell-radius`       | Cell border radius             |
| `--otp-cell-border-color` | Default cell border color      |
| `--otp-cell-focus-border` | Cell border color when focused |

## Accessibility

The OTP input component follows WCAG 2.1 Level AA standards.

### `sg-otp-input`

✅ **Keyboard Navigation**

- Focus auto-advances to the next cell on valid input; `Backspace` moves back and clears the cell.
- `Tab` moves focus out of the group; paste fills all cells at once.

✅ **Screen Readers**

- Renders as a `<fieldset>` with a `<legend>` for the `label` attribute.
- `autocomplete="one-time-code"` is set automatically on each cell input.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Always provide a `label` attribute to give context (e.g. `"Verification code"`).
- Use `masked` for PINs and security codes to prevent shoulder-surfing.
- Listen to `complete` (not `change`) to trigger auto-submission after the last cell is filled.
- Keep `length` at 4–8 cells — more cells increase cognitive load.

**Don't:**

- Auto-submit without giving users a chance to review — show a confirmation step before sending.
- Use `alphanumeric` for numeric-only codes (e.g. SMS OTPs) — numerics trigger the numeric keyboard on mobile.

## Related Components

- [Input](./input) — plain single-line input field
