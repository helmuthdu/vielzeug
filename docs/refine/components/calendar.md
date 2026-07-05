# Calendar

An accessible, always-visible inline calendar. Supports day / month / year drill-down views, min/max bounds, disabled weekend days, theming, and native form association. Use this when you want the calendar rendered directly in the page — see [Date Picker](/refine/components/date-picker) for the trigger + popup variant.

## With Pre-selected Value

<ComponentPreview vertical>

```html
<ore-calendar value="2025-06-15"></ore-calendar>
```

</ComponentPreview>

## Min / Max Bounds

<ComponentPreview vertical>

```html
<ore-calendar value="2025-06-15" min="2025-06-01" max="2025-06-30"></ore-calendar>
```

</ComponentPreview>

## Disabled Weekends

Pass a JSON array of day-of-week indices (0 = Sunday … 6 = Saturday) to `weekend-days`.

<ComponentPreview vertical>

```html
<ore-calendar weekend-days="[0,6]"></ore-calendar>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <ore-calendar value="2025-06-10" color="primary"></ore-calendar>
  <ore-calendar value="2025-06-10" color="secondary"></ore-calendar>
</div>
```

</ComponentPreview>

<ComponentPreview vertical>

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <ore-calendar value="2025-06-10" color="success"></ore-calendar>
  <ore-calendar value="2025-06-10" color="warning"></ore-calendar>
  <ore-calendar value="2025-06-10" color="error"></ore-calendar>
</div>
```

</ComponentPreview>

## Calendar Events

Pass an array of `CalendarEvent` objects via the `events` JS property. Each entry requires an `id`, a `date` (ISO 8601), and a `label`. An optional `color` accepts any CSS color value.

**Normal mode** — up to 3 colored dots per cell; additional events appear as a `+N` count.

**Expanded mode** — up to 3 colored pills with labels; additional events appear as `+N more`.

<ComponentPreview vertical>

```html
<ore-calendar id="cal-events" value="2025-06-15"></ore-calendar>
<script>
  document.getElementById('cal-events').events = [
    { id: '1', date: '2025-06-10', label: 'Team standup', color: 'var(--color-primary)' },
    { id: '2', date: '2025-06-10', label: 'Lunch with Alice' },
    { id: '3', date: '2025-06-15', label: 'Release v2.0', color: '#e11d48' },
    { id: '4', date: '2025-06-20', label: 'Sprint review' },
    { id: '5', date: '2025-06-20', label: 'Retro', color: 'var(--color-success)' },
    { id: '6', date: '2025-06-20', label: 'Deploy', color: 'var(--color-warning)' },
    { id: '7', date: '2025-06-20', label: 'Post-mortem' },
  ];
</script>
```

</ComponentPreview>

### Expanded with events

<ComponentPreview vertical>

```html
<ore-calendar id="cal-exp-events" expanded value="2025-06-15"></ore-calendar>
<script>
  document.getElementById('cal-exp-events').events = [
    { id: '1', date: '2025-06-10', label: 'Team standup', color: 'var(--color-primary)' },
    { id: '2', date: '2025-06-10', label: 'Lunch with Alice' },
    { id: '3', date: '2025-06-15', label: 'Release v2.0', color: '#e11d48' },
    { id: '4', date: '2025-06-20', label: 'Sprint review' },
    { id: '5', date: '2025-06-20', label: 'Retro', color: 'var(--color-success)' },
  ];
</script>
```

</ComponentPreview>

### Events overflow

When a day has more than 3 events, the first 3 are shown and the rest are summarised. This applies to both dots (normal mode) and pills (expanded mode).

<ComponentPreview vertical>

```html
<ore-calendar id="cal-overflow" value="2025-06-15"></ore-calendar>
<script>
  document.getElementById('cal-overflow').events = [
    { id: '1', date: '2025-06-15', label: 'Standup', color: 'var(--color-primary)' },
    { id: '2', date: '2025-06-15', label: 'Design review' },
    { id: '3', date: '2025-06-15', label: 'Release v2.0', color: '#e11d48' },
    { id: '4', date: '2025-06-15', label: 'Retrospective', color: 'var(--color-success)' },
    { id: '5', date: '2025-06-15', label: 'Deploy to prod', color: 'var(--color-warning)' },
  ];
</script>
```

</ComponentPreview>

<ComponentPreview vertical>

```html
<ore-calendar id="cal-overflow-exp" expanded value="2025-06-15"></ore-calendar>
<script>
  document.getElementById('cal-overflow-exp').events = [
    { id: '1', date: '2025-06-15', label: 'Standup', color: 'var(--color-primary)' },
    { id: '2', date: '2025-06-15', label: 'Design review' },
    { id: '3', date: '2025-06-15', label: 'Release v2.0', color: '#e11d48' },
    { id: '4', date: '2025-06-15', label: 'Retrospective', color: 'var(--color-success)' },
    { id: '5', date: '2025-06-15', label: 'Deploy to prod', color: 'var(--color-warning)' },
  ];
</script>
```

</ComponentPreview>

## Expanded Layout

Use `expanded` for a full-page, calendar-app style layout. Each day cell becomes tall with the day number shown as a circle in the top-left corner, leaving the remaining space for event content. The minimum cell height defaults to `var(--size-28)` and can be overridden with `--calendar-expanded-cell-height`.

<ComponentPreview vertical>

```html
<ore-calendar expanded value="2025-06-15"></ore-calendar>
```

</ComponentPreview>

<ComponentPreview vertical>

```html
<ore-calendar expanded value="2025-06-15" color="primary"></ore-calendar>
```

</ComponentPreview>

## Disabled

<ComponentPreview vertical>

```html
<ore-calendar value="2025-06-15" disabled></ore-calendar>
```

</ComponentPreview>

## Localised

<ComponentPreview vertical>

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <ore-calendar locale="fr-FR" value="2025-06-15"></ore-calendar>
  <ore-calendar locale="ar-SA" value="2025-06-15"></ore-calendar>
</div>
```

</ComponentPreview>

## Inside a Form

<ComponentPreview vertical>

```html
<form id="booking-form">
  <ore-calendar name="appointment" value="2025-06-15" required></ore-calendar>
  <button type="submit" style="margin-top:1rem">Submit</button>
</form>
<script>
  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    alert('appointment: ' + data.get('appointment'));
  });
</script>
```

</ComponentPreview>

## Listening for Changes

```js
document.querySelector('ore-calendar').addEventListener('change', (e) => {
  console.log(e.detail.isoValue); // '2025-06-15' or null
});
```

## View Cycling

The header label button cycles through three views on each click:

1. **Day** — the standard month grid; Previous/Next navigate by month
2. **Month** — a 4×3 grid of abbreviated month names; click a month to return to day view at that month
3. **Year** — a 4×3 grid of year numbers; click a year to go to month view for that year

The calendar panel maintains a stable size across all three views — day view reserves space for a maximum 6-week month, and month/year views fill the same width.

## API Reference

### Props

| Prop           | Type              | Default        | Description                                                                                           |
| -------------- | ----------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `value`        | `string`          | —              | Selected date in ISO 8601 format (`yyyy-MM-dd`)                                                       |
| `min`          | `string`          | —              | Earliest selectable date (`yyyy-MM-dd`, inclusive)                                                    |
| `max`          | `string`          | —              | Latest selectable date (`yyyy-MM-dd`, inclusive)                                                      |
| `weekend-days` | `number[]`        | `[]`           | JSON array of day-of-week indices to disable (0 = Sunday … 6 = Saturday). e.g. `weekend-days="[0,6]"` |
| `locale`       | `string`          | browser locale | BCP 47 locale string for day/month names                                                              |
| `color`        | `string`          | —              | Theme color: `primary` \| `secondary` \| `info` \| `success` \| `warning` \| `error`                  |
| `size`         | `string`          | `md`           | Component size: `sm` \| `md` \| `lg`                                                                  |
| `rounded`      | `string`          | —              | Border radius override                                                                                |
| `disabled`     | `boolean`         | `false`        | Disable all interaction                                                                               |
| `required`     | `boolean`         | `false`        | Required field (form association)                                                                     |
| `name`         | `string`          | —              | Form field name                                                                                       |
| `events`       | `CalendarEvent[]` | `[]`           | Calendar events to display. Dots in normal mode, pills in expanded mode. Set via JS property          |
| `expanded`     | `boolean`         | `false`        | Expanded calendar-app layout with tall cells and top-aligned day number circles                       |
| `fullwidth`    | `boolean`         | `false`        | Expand calendar to full container width                                                               |

### CalendarEvent

| Field   | Type     | Required | Description                                                    |
| ------- | -------- | -------- | -------------------------------------------------------------- |
| `id`    | `string` | Yes      | Unique identifier                                              |
| `date`  | `string` | Yes      | ISO 8601 date the event falls on (`yyyy-MM-dd`)                |
| `label` | `string` | Yes      | Short label shown in the cell (pill text in expanded mode)     |
| `color` | `string` | —        | Any CSS color value. Falls back to the component's theme color |

### Events

| Event    | Detail                         | Description                                                                                  |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `change` | `{ isoValue: string \| null }` | Fired when a date is selected. `isoValue` is the ISO 8601 date string or `null` when cleared |

### CSS Custom Properties

| Property                          | Default                | Description                                            |
| --------------------------------- | ---------------------- | ------------------------------------------------------ |
| `--calendar-bg`                   | `--color-canvas`       | Calendar background colour                             |
| `--calendar-border-color`         | `--color-contrast-200` | Calendar border colour                                 |
| `--calendar-radius`               | `--rounded-xl`         | Calendar border radius                                 |
| `--calendar-shadow`               | `--shadow-md`          | Calendar drop shadow                                   |
| `--calendar-day-selected-bg`      | theme focus color      | Background of the selected day cell                    |
| `--calendar-day-today-color`      | theme focus color      | Color of today's date number                           |
| `--calendar-day-outside-opacity`  | `0.35`                 | Opacity of days outside the visible month              |
| `--calendar-expanded-cell-height` | `var(--size-28)`       | Minimum height of each day cell in the expanded layout |

### Parts

| Part       | Description                           |
| ---------- | ------------------------------------- |
| `calendar` | The root calendar panel               |
| `header`   | Calendar header (nav buttons + label) |
| `grid`     | The day grid                          |
| `day`      | Individual day cell                   |

## Accessibility

`ore-calendar` implements the [ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). The host element carries `role="group"` and `aria-label` set to the currently visible month/year. Each view (day/month/year) uses `role="grid"` with cells grouped into `role="row"` elements — `role="columnheader"` for the day view's weekday headers, `role="gridcell"` on every day/month/year cell.

Selected days have `aria-selected="true"`; unselected days have `aria-selected="false"`. Today's cell carries `aria-current="date"`. Out-of-range and disabled-weekday cells have `aria-disabled="true"` and `tabindex="-1"`, removing them from tab order. When the `disabled` attribute is set on the host, it receives `aria-disabled="true"`, all cells become `tabindex="-1"`, and no interaction is processed.

### Keyboard Navigation

**Day grid**

| Key               | Action                                         |
| ----------------- | ---------------------------------------------- |
| `ArrowRight`      | Move focus to the next day                     |
| `ArrowLeft`       | Move focus to the previous day                 |
| `ArrowDown`       | Move focus one week forward (same weekday)     |
| `ArrowUp`         | Move focus one week back (same weekday)        |
| `Home`            | Move focus to the first day of the current row |
| `End`             | Move focus to the last day of the current row  |
| `Enter` / `Space` | Select the focused day                         |

**Month and year grids**

| Key               | Action                                          |
| ----------------- | ------------------------------------------------ |
| `ArrowRight`      | Move focus to the next cell                       |
| `ArrowLeft`       | Move focus to the previous cell                   |
| `ArrowDown`       | Move focus one row forward (4-column grid)        |
| `ArrowUp`         | Move focus one row back (4-column grid)           |
| `Home`            | Move focus to the first cell of the current row   |
| `End`             | Move focus to the last cell of the current row    |
| `Enter` / `Space` | Select the focused month / year                   |

**Header controls**

| Key             | Action                                              |
| --------------- | --------------------------------------------------- |
| Click / `Enter` | Previous / Next button — navigate by month or year  |
| Click / `Enter` | Label button — cycle view: Day → Month → Year → Day |

## Related Components

- [Date Picker](/refine/components/date-picker) — trigger + popup wrapper around the same calendar logic
