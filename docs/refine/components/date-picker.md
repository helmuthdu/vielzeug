# Date Picker

An accessible, keyboard-navigable date picker with an inline calendar popup. Supports day / month / year drill-down views, min/max bounds, disabled weekend days, and native form association.

## Basic Usage

<ComponentPreview vertical>

```html
<ore-date-picker label="Appointment date"></ore-date-picker>
```

</ComponentPreview>

Listen for the `change` event to react to selections:

```js
document.querySelector('ore-date-picker').addEventListener('change', (e) => {
  console.log(e.detail.isoValue); // '2025-06-15' or null
});
```

## With Min / Max Bounds

Restrict the selectable range with ISO 8601 `min` and `max` attributes.

<ComponentPreview vertical>

```html
<ore-date-picker label="Conference date" min="2025-09-01" max="2025-09-30"> </ore-date-picker>
```

</ComponentPreview>

## Disabling Weekends

Pass a JSON array of day-of-week indices (0 = Sunday … 6 = Saturday) to `weekend-days`.

<ComponentPreview vertical>

```html
<ore-date-picker label="Business day" weekend-days="[0,6]"></ore-date-picker>
```

</ComponentPreview>

## Locale

Override the display locale with any BCP 47 tag. Day and month names update automatically.

<ComponentPreview>

```html
<ore-date-picker label="Datum" locale="de-DE"></ore-date-picker>
<ore-date-picker label="日付" locale="ja-JP"></ore-date-picker>
```

</ComponentPreview>

## Pre-selected Value

Set `value` to an ISO 8601 date string to initialise the selection.

<ComponentPreview vertical>

```html
<ore-date-picker label="Start date" value="2025-06-15"></ore-date-picker>
```

</ComponentPreview>

## Form Integration

`ore-date-picker` is form-associated. The submitted value is the ISO 8601 string or empty string when no date is selected.

<ComponentPreview vertical>

```html
<form>
  <ore-date-picker name="booking_date" label="Booking date" required></ore-date-picker>
  <button type="submit">Submit</button>
</form>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<ore-date-picker size="sm" placeholder="Small"></ore-date-picker>
<ore-date-picker size="md" placeholder="Medium"></ore-date-picker>
<ore-date-picker size="lg" placeholder="Large"></ore-date-picker>
```

</ComponentPreview>

## Variants

<ComponentPreview>

```html
<ore-date-picker variant="flat" placeholder="Flat"></ore-date-picker>
<ore-date-picker variant="bordered" placeholder="Bordered"></ore-date-picker>
<ore-date-picker variant="outline" placeholder="Outline"></ore-date-picker>
<ore-date-picker variant="ghost" placeholder="Ghost"></ore-date-picker>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<ore-grid cols="2" cols-sm="3" cols-md="4" gap="md">
  <ore-date-picker placeholder="Default"></ore-date-picker>
  <ore-date-picker color="primary" placeholder="Primary"></ore-date-picker>
  <ore-date-picker color="secondary" placeholder="Secondary"></ore-date-picker>
  <ore-date-picker color="info" placeholder="Info"></ore-date-picker>
  <ore-date-picker color="success" placeholder="Success"></ore-date-picker>
  <ore-date-picker color="warning" placeholder="Warning"></ore-date-picker>
  <ore-date-picker color="error" placeholder="Error"></ore-date-picker>
</ore-grid>
```

</ComponentPreview>

## Error and Helper Text

<ComponentPreview vertical>

```html
<ore-date-picker label="Return date" helper="Pick a date within the next 30 days"> </ore-date-picker>

<ore-date-picker label="Departure date" error="A valid date is required" color="error"> </ore-date-picker>
```

</ComponentPreview>

## Disabled

<ComponentPreview vertical>

```html
<ore-date-picker label="Read-only date" value="2025-01-01" disabled></ore-date-picker>
```

</ComponentPreview>

## API

### Props

| Prop              | Type                   | Default        | Description                                                                 |
| ----------------- | ---------------------- | -------------- | --------------------------------------------------------------------------- |
| `value`           | `string`               | —              | Selected date in ISO 8601 format (`yyyy-MM-dd`)                             |
| `min`             | `string`               | —              | Minimum selectable date (`yyyy-MM-dd`, inclusive)                           |
| `max`             | `string`               | —              | Maximum selectable date (`yyyy-MM-dd`, inclusive)                           |
| `label`           | `string`               | —              | Visible label                                                               |
| `label-placement` | `'inset' \| 'outside'` | `'inset'`      | Label position                                                              |
| `placeholder`     | `string`               | —              | Trigger placeholder when no date selected                                   |
| `name`            | `string`               | —              | Form field name                                                             |
| `disabled`        | `boolean`              | `false`        | Disable the picker                                                          |
| `required`        | `boolean`              | `false`        | Mark as required                                                            |
| `error`           | `string`               | —              | Error message (shown below trigger in error color)                          |
| `helper`          | `string`               | —              | Helper text (shown below trigger)                                           |
| `locale`          | `string`               | browser locale | BCP 47 locale for day/month names                                           |
| `weekend-days`    | `string`               | —              | JSON array of day indices to disable (e.g. `"[0,6]"`)                       |
| `color`           | `string`               | —              | Theme color (`primary`, `secondary`, `info`, `success`, `warning`, `error`) |
| `size`            | `string`               | `'md'`         | Size variant: `sm`, `md`, `lg`                                              |
| `variant`         | `string`               | —              | Visual variant: `flat`, `solid`, `bordered`, `outline`, `ghost`             |
| `rounded`         | `string`               | —              | Border radius override                                                      |
| `fullwidth`       | `boolean`              | `false`        | Expand to full container width                                              |

### Events

| Event    | Detail                         | Description                                                                                  |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `change` | `{ isoValue: string \| null }` | Fired when a date is selected. `isoValue` is the ISO 8601 date string or `null` when cleared |

### CSS Custom Properties

| Property                            | Description                               |
| ----------------------------------- | ----------------------------------------- |
| `--date-picker-bg`                  | Calendar panel background                 |
| `--date-picker-border-color`        | Calendar panel border                     |
| `--date-picker-radius`              | Border radius of trigger and calendar     |
| `--date-picker-shadow`              | Calendar drop shadow                      |
| `--date-picker-day-selected-bg`     | Background of the selected day cell       |
| `--date-picker-day-today-color`     | Text color of today's date                |
| `--date-picker-day-outside-opacity` | Opacity of days outside the visible month |

### Parts

| Part       | Description                 |
| ---------- | --------------------------- |
| `field`    | The trigger button / field  |
| `calendar` | The floating calendar panel |
| `header`   | Calendar navigation header  |
| `grid`     | Day grid (`role="grid"`)    |
| `day`      | Individual day cell         |

## Accessibility

`ore-date-picker` follows the [ARIA Date Picker Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).

The trigger has `role="combobox"` and `aria-haspopup="dialog"`, with `aria-expanded` reflecting the open/closed state. The calendar panel has `role="dialog"` and `aria-modal="true"`. The day grid uses `role="grid"`, with each day rendered as a `role="gridcell"` carrying `aria-selected` and `aria-disabled` attributes. Weekday column headers use `role="columnheader"`. Today's date receives `aria-current="date"`. Disabled days have `tabindex="-1"` and `pointer-events: none`.

Keyboard navigation is fully supported: `Escape` closes the calendar from any focused element inside it. Arrow keys navigate day cells — `ArrowRight`/`ArrowLeft` move by one day, `ArrowDown`/`ArrowUp` move by one week, and `Home`/`End` move to the first or last day of the current row.

## Related

- [Input](./input.md) — plain text input
- [Number Input](./number-input.md) — numeric spinner
- [Select](./select.md) — dropdown selection
- [Form](./form.md) — form context and validation
