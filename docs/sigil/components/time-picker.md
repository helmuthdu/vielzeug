# Time Picker

An accessible, keyboard-navigable time picker with a scrollable clock dropdown. Supports 12/24-hour display formats, configurable minute steps, min/max bounds, and native form association.

## Features

- <sg-icon name="keyboard" size="16"></sg-icon> **Full Keyboard Nav** — Arrow keys cycle hours/minutes/period; Enter confirms; Escape dismisses
- <sg-icon name="accessibility" size="16"></sg-icon> **ARIA** — `role="combobox"` trigger, `role="listbox"` dropdown, `role="group"` columns, `role="option"` cells with `aria-selected` and `aria-disabled`
- <sg-icon name="clock" size="16"></sg-icon> **12 / 24-hour modes** — set `time-format="12"` for AM/PM display with a dedicated period column
- <sg-icon name="timer" size="16"></sg-icon> **Minute steps** — `minute-step` controls the increment (1–59, default 5)
- <sg-icon name="ban" size="16"></sg-icon> **Min / Max bounds** — disable out-of-range hour and minute options
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — participates in native form submission; value is the 24-hour `HH:MM` string
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="palette" size="16"></sg-icon> **5 Variants** — solid, flat, bordered, outline, ghost
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="file-pen" size="16"></sg-icon> **Helper & Error Text** — inline assistive text below the trigger

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/time-picker/time-picker.ts
:::

## Basic Usage

<ComponentPreview height="400px">

```html
<sg-time-picker label="Meeting time"></sg-time-picker>
```

</ComponentPreview>

Listen for the `change` event to react to selections:

```js
document.querySelector('sg-time-picker').addEventListener('change', (e) => {
  console.log(e.detail.value); // '09:30'
});
```

## Pre-selected Value

Set `value` to an `HH:MM` (24-hour) string to initialise the selection.

<ComponentPreview height="400px">

```html
<sg-time-picker label="Start time" value="09:30"></sg-time-picker>
```

</ComponentPreview>

## 12-Hour Format

Use `time-format="12"` to show an AM/PM period column. The `change` event still emits a 24-hour `HH:MM` value.

<ComponentPreview height="400px">

```html
<sg-time-picker label="Appointment" time-format="12" value="14:00"></sg-time-picker>
```

</ComponentPreview>

## Minute Step

Control the minute increment with `minute-step`. Common values: `1`, `5`, `10`, `15`, `30`.

<ComponentPreview height="400px">

```html
<sg-time-picker label="Duration" minute-step="15"></sg-time-picker>
```

</ComponentPreview>

## Min / Max Bounds

Restrict the selectable range with `min` and `max` in `HH:MM` format. Out-of-range options are disabled.

<ComponentPreview height="400px">

```html
<sg-time-picker label="Office hours" min="09:00" max="17:00"> </sg-time-picker>
```

</ComponentPreview>

## Form Integration

`sg-time-picker` is form-associated. The submitted value is the 24-hour `HH:MM` string, or an empty string when nothing is selected.

<ComponentPreview height="400px">

```html
<form>
  <sg-time-picker name="meeting_time" label="Meeting time" required></sg-time-picker>
  <button type="submit">Submit</button>
</form>
```

</ComponentPreview>

## Sizes

<ComponentPreview height="400px">

```html
<sg-time-picker size="sm" label="Small"></sg-time-picker>
<sg-time-picker size="md" label="Medium"></sg-time-picker>
<sg-time-picker size="lg" label="Large"></sg-time-picker>
```

</ComponentPreview>

## Variants

<ComponentPreview>

```html
<sg-time-picker variant="flat" placeholder="Flat"></sg-time-picker>
<sg-time-picker variant="bordered" placeholder="Bordered"></sg-time-picker>
<sg-time-picker variant="outline" placeholder="Outline"></sg-time-picker>
<sg-time-picker variant="ghost" placeholder="Ghost"></sg-time-picker>
```

</ComponentPreview>

## Colors

<ComponentPreview>

```html
<sg-time-picker placeholder="Default"></sg-time-picker>
<sg-time-picker color="primary" placeholder="Primary"></sg-time-picker>
<sg-time-picker color="secondary" placeholder="Secondary"></sg-time-picker>
<sg-time-picker color="success" placeholder="Success"></sg-time-picker>
<sg-time-picker color="warning" placeholder="Warning"></sg-time-picker>
<sg-time-picker color="error" placeholder="Error"></sg-time-picker>
```

</ComponentPreview>

## Error and Helper Text

<ComponentPreview height="400px">

```html
<sg-time-picker label="Departure time" helper="Must be between 06:00 and 22:00"> </sg-time-picker>

<sg-time-picker label="Return time" error="A valid time is required" color="error"> </sg-time-picker>
```

</ComponentPreview>

## Disabled

<ComponentPreview height="400px">

```html
<sg-time-picker label="Read-only time" value="10:00" disabled></sg-time-picker>
```

</ComponentPreview>

## API

### Props

| Prop              | Type                   | Default   | Description                                                                 |
| ----------------- | ---------------------- | --------- | --------------------------------------------------------------------------- |
| `value`           | `string`               | —         | Selected time in 24-hour `HH:MM` format                                     |
| `min`             | `string`               | —         | Minimum selectable time (`HH:MM`, inclusive)                                |
| `max`             | `string`               | —         | Maximum selectable time (`HH:MM`, inclusive)                                |
| `time-format`     | `'12' \| '24'`         | `'24'`    | Display format; `'12'` adds an AM/PM column                                 |
| `minute-step`     | `number`               | `5`       | Minute increment (1–59)                                                     |
| `label`           | `string`               | —         | Visible label                                                               |
| `label-placement` | `'inset' \| 'outside'` | `'inset'` | Label position                                                              |
| `placeholder`     | `string`               | —         | Trigger placeholder when no time is selected                                |
| `name`            | `string`               | —         | Form field name                                                             |
| `disabled`        | `boolean`              | `false`   | Disable the picker                                                          |
| `required`        | `boolean`              | `false`   | Mark as required                                                            |
| `error`           | `string`               | —         | Error message (shown below trigger)                                         |
| `helper`          | `string`               | —         | Helper text (shown below trigger)                                           |
| `color`           | `string`               | —         | Theme color (`primary`, `secondary`, `info`, `success`, `warning`, `error`) |
| `size`            | `string`               | `'md'`    | Size variant: `sm`, `md`, `lg`                                              |
| `variant`         | `string`               | —         | Visual variant: `flat`, `solid`, `bordered`, `outline`, `ghost`             |
| `rounded`         | `string`               | —         | Border radius override                                                      |
| `fullwidth`       | `boolean`              | `false`   | Expand to full container width                                              |

### Events

| Event    | Detail                      | Description                                                        |
| -------- | --------------------------- | ------------------------------------------------------------------ |
| `change` | `{ value: string \| null }` | Fired when a time is confirmed. `value` is always 24-hour `HH:MM`. |

### CSS Custom Properties

| Property                        | Description                |
| ------------------------------- | -------------------------- |
| `--time-picker-bg`              | Dropdown background        |
| `--time-picker-border-color`    | Dropdown border color      |
| `--time-picker-radius`          | Dropdown border radius     |
| `--time-picker-shadow`          | Dropdown drop shadow       |
| `--time-picker-selected-bg`     | Selected option background |
| `--time-picker-option-hover-bg` | Hovered option background  |

### Parts

| Part       | Description                                    |
| ---------- | ---------------------------------------------- |
| `field`    | The trigger field (`sg-input`)                 |
| `dropdown` | The floating time dropdown panel               |
| `column`   | A scrollable column (hours / minutes / period) |
| `option`   | An individual time option cell                 |

## Accessibility

`sg-time-picker` follows the [ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) for the trigger and [Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) for the dropdown.

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
