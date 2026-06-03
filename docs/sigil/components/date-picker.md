# Date Picker

An accessible, keyboard-navigable date picker with an inline calendar popup. Supports day / month / year drill-down views, min/max bounds, disabled weekend days, and native form association.

## Features

- ⌨️ **Full Keyboard Nav** — Enter, Space, Escape, Arrow keys on individual day cells
- ♿ **ARIA** — `role="combobox"` trigger, `role="dialog"` calendar, `role="grid"` day grid, `role="gridcell"` day cells, `aria-selected`, `aria-current="date"` for today
- 📅 **Three views** — Day → Month → Year drill-down with animated header label cycling
- 🌍 **Internationalised** — Uses `Intl.DateTimeFormat`; pass any BCP 47 locale string
- 🚫 **Min / Max bounds** — ISO 8601 `min` / `max` attributes; out-of-range days are disabled
- 📆 **Weekend disabling** — `weekend-days="0,6"` disables Sundays and Saturdays
- 🔗 **Form-Associated** — participates in native form submission; value is the ISO date string
- 📏 **3 Sizes** — sm, md, lg
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 📝 **Helper & Error Text** — inline assistive text below the trigger

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/date-picker/date-picker.ts
:::

## Basic Usage

<ComponentPreview vertical height="400px">

```html
<bit-date-picker label="Appointment date"></bit-date-picker>
```

</ComponentPreview>

Listen for the `change` event to react to selections:

```js
document.querySelector('bit-date-picker').addEventListener('change', (e) => {
  console.log(e.detail.isoValue); // '2025-06-15'
  console.log(e.detail.value);    // Date object
});
```

## With Min / Max Bounds

Restrict the selectable range with ISO 8601 `min` and `max` attributes.

<ComponentPreview vertical height="400px">

```html
<bit-date-picker
  label="Conference date"
  min="2025-09-01"
  max="2025-09-30">
</bit-date-picker>
```

</ComponentPreview>

## Disabling Weekends

Pass comma-separated day-of-week indices (0 = Sunday, 6 = Saturday) to `weekend-days`.

<ComponentPreview vertical height="400px">

```html
<bit-date-picker
  label="Business day"
  weekend-days="0,6">
</bit-date-picker>
```

</ComponentPreview>

## Locale

Override the display locale with any BCP 47 tag. Day and month names update automatically.

<ComponentPreview>

```html
<bit-date-picker label="Datum" locale="de-DE"></bit-date-picker>
<bit-date-picker label="日付" locale="ja-JP"></bit-date-picker>
```

</ComponentPreview>

## Pre-selected Value

Set `value` to an ISO 8601 date string to initialise the selection.

<ComponentPreview vertical height="400px">

```html
<bit-date-picker label="Start date" value="2025-06-15"></bit-date-picker>
```

</ComponentPreview>

## Form Integration

`bit-date-picker` is form-associated. The submitted value is the ISO 8601 string or empty string when no date is selected.

<ComponentPreview vertical height="400px">

```html
<form>
  <bit-date-picker name="booking_date" label="Booking date" required></bit-date-picker>
  <button type="submit">Submit</button>
</form>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical height="400px">

```html
<bit-date-picker size="sm" placeholder="Small"></bit-date-picker>
<bit-date-picker size="md" placeholder="Medium"></bit-date-picker>
<bit-date-picker size="lg" placeholder="Large"></bit-date-picker>
```

</ComponentPreview>

## Variants

<ComponentPreview>

```html
<bit-date-picker variant="flat"     placeholder="Flat"></bit-date-picker>
<bit-date-picker variant="bordered" placeholder="Bordered"></bit-date-picker>
<bit-date-picker variant="outline"  placeholder="Outline"></bit-date-picker>
<bit-date-picker variant="ghost"    placeholder="Ghost"></bit-date-picker>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical height="400px">

```html
<bit-grid cols="2" cols-sm="3" cols-md="4" gap="md">
  <bit-date-picker placeholder="Default"></bit-date-picker>
  <bit-date-picker color="primary"   placeholder="Primary"></bit-date-picker>
  <bit-date-picker color="secondary" placeholder="Secondary"></bit-date-picker>
  <bit-date-picker color="info"      placeholder="Info"></bit-date-picker>
  <bit-date-picker color="success"   placeholder="Success"></bit-date-picker>
  <bit-date-picker color="warning"   placeholder="Warning"></bit-date-picker>
  <bit-date-picker color="error"     placeholder="Error"></bit-date-picker>
</bit-grid>
```

</ComponentPreview>

## Error and Helper Text

<ComponentPreview vertical height="400px">

```html
<bit-date-picker
  label="Return date"
  helper="Pick a date within the next 30 days">
</bit-date-picker>

<bit-date-picker
  label="Departure date"
  error="A valid date is required"
  color="error">
</bit-date-picker>
```

</ComponentPreview>

## Disabled

<ComponentPreview vertical height="400px">

```html
<bit-date-picker label="Read-only date" value="2025-01-01" disabled></bit-date-picker>
```

</ComponentPreview>

## API

### Props

| Prop            | Type      | Default | Description                                                          |
| --------------- | --------- | ------- | -------------------------------------------------------------------- |
| `value`         | `string`  | —       | Selected date in ISO 8601 format (`yyyy-MM-dd`)                      |
| `min`           | `string`  | —       | Minimum selectable date (`yyyy-MM-dd`, inclusive)                    |
| `max`           | `string`  | —       | Maximum selectable date (`yyyy-MM-dd`, inclusive)                    |
| `label`         | `string`  | —       | Visible label                                                        |
| `label-placement` | `'inset' \| 'outside'` | `'inset'` | Label position                               |
| `placeholder`   | `string`  | —       | Trigger placeholder when no date selected                            |
| `name`          | `string`  | —       | Form field name                                                      |
| `disabled`      | `boolean` | `false` | Disable the picker                                                   |
| `required`      | `boolean` | `false` | Mark as required                                                     |
| `error`         | `string`  | —       | Error message (shown below trigger in error color)                   |
| `helper`        | `string`  | —       | Helper text (shown below trigger)                                    |
| `locale`        | `string`  | browser locale | BCP 47 locale for day/month names                           |
| `weekend-days`  | `string`  | —       | Comma-separated day indices to disable (e.g. `"0,6"`)                |
| `color`         | `string`  | —       | Theme color (`primary`, `secondary`, `info`, `success`, `warning`, `error`) |
| `size`          | `string`  | `'md'`  | Size variant: `sm`, `md`, `lg`                                       |
| `variant`       | `string`  | —       | Visual variant: `flat`, `solid`, `bordered`, `outline`, `ghost`      |
| `rounded`       | `string`  | —       | Border radius override                                               |
| `fullwidth`     | `boolean` | `false` | Expand to full container width                                       |

### Events

| Event    | Detail                                            | Description                         |
| -------- | ------------------------------------------------- | ----------------------------------- |
| `change` | `{ value: Date \| null, isoValue: string \| null }` | Fired when a date is selected or cleared |

### CSS Custom Properties

| Property                           | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `--date-picker-bg`                 | Calendar panel background                    |
| `--date-picker-border-color`       | Calendar panel border                        |
| `--date-picker-radius`             | Border radius of trigger and calendar        |
| `--date-picker-shadow`             | Calendar drop shadow                         |
| `--date-picker-day-selected-bg`    | Background of the selected day cell          |
| `--date-picker-day-today-color`    | Text color of today's date                   |
| `--date-picker-day-outside-opacity`| Opacity of days outside the visible month    |

### Parts

| Part       | Description                       |
| ---------- | --------------------------------- |
| `field`    | The trigger button / field        |
| `calendar` | The floating calendar panel       |
| `header`   | Calendar navigation header        |
| `grid`     | Day grid (`role="grid"`)          |
| `day`      | Individual day cell               |

## Accessibility

`bit-date-picker` follows the [ARIA Date Picker Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).

- The trigger has `role="combobox"` and `aria-haspopup="dialog"`.
- The calendar panel has `role="dialog"` and `aria-modal="true"`.
- The day grid has `role="grid"`; each day is a `role="gridcell"` with `aria-selected` and `aria-disabled`.
- Today's date receives `aria-current="date"`.
- Weekday column headers use `role="columnheader"`.
- `Escape` closes the calendar from any focused element inside it.
- The trigger `aria-expanded` attribute reflects open/closed state.
- Disabled days have `tabindex="-1"` and `pointer-events: none`.

## Related

- [Input](./input.md) — plain text input
- [Number Input](./number-input.md) — numeric spinner
- [Select](./select.md) — dropdown selection
- [Form](./form.md) — form context and validation
