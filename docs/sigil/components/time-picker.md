# Time Picker

An accessible, keyboard-navigable time picker with a scrollable clock dropdown. Supports 12/24-hour display formats, configurable minute steps, min/max bounds, and native form association.

## Features

- ⌨️ **Full Keyboard Nav** — Arrow keys cycle hours/minutes/period; Enter confirms; Escape dismisses
- ♿ **ARIA** — `role="combobox"` trigger, `role="listbox"` dropdown, `role="group"` columns, `role="option"` cells with `aria-selected` and `aria-disabled`
- 🕐 **12 / 24-hour modes** — set `time-format="12"` for AM/PM display with a dedicated period column
- ⏱️ **Minute steps** — `minute-step` controls the increment (1–59, default 5)
- 🚫 **Min / Max bounds** — disable out-of-range hour and minute options
- 🔗 **Form-Associated** — participates in native form submission; value is the 24-hour `HH:MM` string
- 📏 **3 Sizes** — sm, md, lg
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 📝 **Helper & Error Text** — inline assistive text below the trigger

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/time-picker/time-picker.ts
:::

## Basic Usage

<ComponentPreview height="400px">

```html
<bit-time-picker label="Meeting time"></bit-time-picker>
```

</ComponentPreview>

Listen for the `change` event to react to selections:

```js
document.querySelector('bit-time-picker').addEventListener('change', (e) => {
  console.log(e.detail.value); // '09:30'
});
```

## Pre-selected Value

Set `value` to an `HH:MM` (24-hour) string to initialise the selection.

<ComponentPreview height="400px">

```html
<bit-time-picker label="Start time" value="09:30"></bit-time-picker>
```

</ComponentPreview>

## 12-Hour Format

Use `time-format="12"` to show an AM/PM period column. The `change` event still emits a 24-hour `HH:MM` value.

<ComponentPreview height="400px">

```html
<bit-time-picker label="Appointment" time-format="12" value="14:00"></bit-time-picker>
```

</ComponentPreview>

## Minute Step

Control the minute increment with `minute-step`. Common values: `1`, `5`, `10`, `15`, `30`.

<ComponentPreview height="400px">

```html
<bit-time-picker label="Duration" minute-step="15"></bit-time-picker>
```

</ComponentPreview>

## Min / Max Bounds

Restrict the selectable range with `min` and `max` in `HH:MM` format. Out-of-range options are disabled.

<ComponentPreview height="400px">

```html
<bit-time-picker
  label="Office hours"
  min="09:00"
  max="17:00">
</bit-time-picker>
```

</ComponentPreview>

## Form Integration

`bit-time-picker` is form-associated. The submitted value is the 24-hour `HH:MM` string, or an empty string when nothing is selected.

<ComponentPreview height="400px">

```html
<form>
  <bit-time-picker name="meeting_time" label="Meeting time" required></bit-time-picker>
  <button type="submit">Submit</button>
</form>
```

</ComponentPreview>

## Sizes

<ComponentPreview height="400px">

```html
<bit-time-picker size="sm" label="Small"></bit-time-picker>
<bit-time-picker size="md" label="Medium"></bit-time-picker>
<bit-time-picker size="lg" label="Large"></bit-time-picker>
```

</ComponentPreview>

## Variants

<ComponentPreview>

```html
<bit-time-picker variant="flat"     placeholder="Flat"></bit-time-picker>
<bit-time-picker variant="bordered" placeholder="Bordered"></bit-time-picker>
<bit-time-picker variant="outline"  placeholder="Outline"></bit-time-picker>
<bit-time-picker variant="ghost"    placeholder="Ghost"></bit-time-picker>
```

</ComponentPreview>

## Colors

<ComponentPreview>

```html
<bit-time-picker placeholder="Default"></bit-time-picker>
<bit-time-picker color="primary"   placeholder="Primary"></bit-time-picker>
<bit-time-picker color="secondary" placeholder="Secondary"></bit-time-picker>
<bit-time-picker color="success"   placeholder="Success"></bit-time-picker>
<bit-time-picker color="warning"   placeholder="Warning"></bit-time-picker>
<bit-time-picker color="error"     placeholder="Error"></bit-time-picker>
```

</ComponentPreview>

## Error and Helper Text

<ComponentPreview height="400px">

```html
<bit-time-picker
  label="Departure time"
  helper="Must be between 06:00 and 22:00">
</bit-time-picker>

<bit-time-picker
  label="Return time"
  error="A valid time is required"
  color="error">
</bit-time-picker>
```

</ComponentPreview>

## Disabled

<ComponentPreview height="400px">

```html
<bit-time-picker label="Read-only time" value="10:00" disabled></bit-time-picker>
```

</ComponentPreview>

## API

### Props

| Prop            | Type                   | Default | Description                                                                 |
| --------------- | ---------------------- | ------- | --------------------------------------------------------------------------- |
| `value`         | `string`               | —       | Selected time in 24-hour `HH:MM` format                                     |
| `min`           | `string`               | —       | Minimum selectable time (`HH:MM`, inclusive)                                |
| `max`           | `string`               | —       | Maximum selectable time (`HH:MM`, inclusive)                                |
| `time-format`   | `'12' \| '24'`         | `'24'`  | Display format; `'12'` adds an AM/PM column                                 |
| `minute-step`   | `number`               | `5`     | Minute increment (1–59)                                                     |
| `label`         | `string`               | —       | Visible label                                                               |
| `label-placement` | `'inset' \| 'outside'` | `'inset'` | Label position                                                          |
| `placeholder`   | `string`               | —       | Trigger placeholder when no time is selected                                |
| `name`          | `string`               | —       | Form field name                                                             |
| `disabled`      | `boolean`              | `false` | Disable the picker                                                          |
| `required`      | `boolean`              | `false` | Mark as required                                                            |
| `error`         | `string`               | —       | Error message (shown below trigger)                                         |
| `helper`        | `string`               | —       | Helper text (shown below trigger)                                           |
| `color`         | `string`               | —       | Theme color (`primary`, `secondary`, `info`, `success`, `warning`, `error`) |
| `size`          | `string`               | `'md'`  | Size variant: `sm`, `md`, `lg`                                              |
| `variant`       | `string`               | —       | Visual variant: `flat`, `solid`, `bordered`, `outline`, `ghost`             |
| `rounded`       | `string`               | —       | Border radius override                                                      |
| `fullwidth`     | `boolean`              | `false` | Expand to full container width                                              |

### Events

| Event    | Detail                   | Description                              |
| -------- | ------------------------ | ---------------------------------------- |
| `change` | `{ value: string \| null }` | Fired when a time is confirmed. `value` is always 24-hour `HH:MM`. |

### CSS Custom Properties

| Property                           | Description                            |
| ---------------------------------- | -------------------------------------- |
| `--time-picker-bg`                 | Dropdown background                    |
| `--time-picker-border-color`       | Dropdown border color                  |
| `--time-picker-radius`             | Dropdown border radius                 |
| `--time-picker-shadow`             | Dropdown drop shadow                   |
| `--time-picker-selected-bg`        | Selected option background             |
| `--time-picker-option-hover-bg`    | Hovered option background              |

### Parts

| Part       | Description                                  |
| ---------- | -------------------------------------------- |
| `field`    | The trigger field (`bit-input`)              |
| `dropdown` | The floating time dropdown panel             |
| `column`   | A scrollable column (hours / minutes / period) |
| `option`   | An individual time option cell               |

## Accessibility

`bit-time-picker` follows the [ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) for the trigger and [Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) for the dropdown.

- The trigger has `role="combobox"`, `aria-haspopup="listbox"`, and `aria-expanded` reflecting open/closed state.
- The dropdown has `role="listbox"` with an `aria-label` derived from the component label.
- Each column is a `role="group"` with an `aria-label` (`"Hours"`, `"Minutes"`, `"Period"`).
- Each option cell has `role="option"`, `aria-selected`, and `aria-disabled`.
- The focused/selected option in each column has `tabindex="0"`; all others have `tabindex="-1"`.
- **Arrow keys** move focus within a column (with wrap-around).
- **Enter** confirms the pending selection and closes the dropdown.
- **Escape** dismisses the dropdown without committing.
- Disabled options have `pointer-events: none` and `aria-disabled="true"`.

## Related

- [Date Picker](./date-picker.md) — calendar date selection
- [Input](./input.md) — plain text input
- [Number Input](./number-input.md) — numeric spinner
- [Form](./form.md) — form context and validation
