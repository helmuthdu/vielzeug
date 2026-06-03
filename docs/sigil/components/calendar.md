# Calendar

An accessible, always-visible inline calendar. Supports day / month / year drill-down views, min/max bounds, disabled weekend days, theming, and native form association. Use this when you want the calendar rendered inline in the page rather than inside a picker popup — see [Date Picker](/sigil/components/date-picker) for the trigger+popup variant.

## Features

- ⌨️ **Full keyboard nav** — Enter, Space, ArrowLeft, ArrowRight on day cells; Enter/Space on month and year cells
- ♿ **ARIA** — `role="group"` host, `role="grid"` day grid, `role="gridcell"` day cells, `aria-selected`, `aria-current="date"` for today, `aria-disabled` on disabled cells
- 📅 **Three views** — Day → Month → Year drill-down with cycling header label
- 🌍 **Internationalised** — Uses `Intl.DateTimeFormat`; pass any BCP 47 locale string
- 🚫 **Min / Max bounds** — ISO 8601 `min` / `max` attributes; out-of-range days are disabled
- 📆 **Weekend disabling** — `weekend-days="0,6"` disables any combination of weekdays
- 🔗 **Form-associated** — participates in native form submission; value is the ISO date string
- 🌈 **6 semantic colors** — primary, secondary, info, success, warning, error
- 🎨 **CSS custom properties** — full theming control via `--calendar-*` tokens

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/calendar/calendar.ts
:::

## Basic Usage

<ComponentPreview vertical height="340px">

```html
<bit-calendar></bit-calendar>
```

</ComponentPreview>

## With Pre-selected Value

<ComponentPreview vertical height="340px">

```html
<bit-calendar value="2025-06-15"></bit-calendar>
```

</ComponentPreview>

## Min / Max Bounds

<ComponentPreview vertical height="340px">

```html
<bit-calendar
  value="2025-06-15"
  min="2025-06-01"
  max="2025-06-30">
</bit-calendar>
```

</ComponentPreview>

## Disabled Weekends

<ComponentPreview vertical height="340px">

```html
<bit-calendar weekend-days="0,6"></bit-calendar>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical height="340px">

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <bit-calendar value="2025-06-10" color="primary"></bit-calendar>
  <bit-calendar value="2025-06-10" color="secondary"></bit-calendar>
</div>
```

</ComponentPreview>

<ComponentPreview vertical height="340px">

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <bit-calendar value="2025-06-10" color="success"></bit-calendar>
  <bit-calendar value="2025-06-10" color="warning"></bit-calendar>
  <bit-calendar value="2025-06-10" color="error"></bit-calendar>
</div>
```

</ComponentPreview>

## Events

Pass an array of `CalendarEvent` objects via the `events` JS property. Each entry needs an `id`, a `date` (ISO 8601), and a `label`. An optional `color` accepts any CSS color value.

**Normal mode** — up to 3 colored dots are shown at the bottom of the day cell; if there are more, a `+N` overflow count is appended.

**Expanded mode** — up to 3 colored pills with their labels are shown. Additional events are summarised as a muted `+N more` indicator.

<ComponentPreview vertical height="380px">

```html
<bit-calendar id="cal-events" value="2025-06-15"></bit-calendar>
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

<ComponentPreview vertical height="720px">

```html
<bit-calendar id="cal-exp-events" expanded value="2025-06-15"></bit-calendar>
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

When a day has more than 3 events, the first 3 are shown and the rest are summarised as `+N more`. This applies to both dots (normal mode) and pills (expanded mode).

<ComponentPreview vertical height="380px">

```html
<bit-calendar id="cal-overflow" value="2025-06-15"></bit-calendar>
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

<ComponentPreview vertical height="720px">

```html
<bit-calendar id="cal-overflow-exp" expanded value="2025-06-15"></bit-calendar>
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

Use `expanded` for a full-page, calendar-app style layout. Cells become tall with the day number shown as a circle in the top-left corner — leaving the rest of the cell open for event content. The minimum cell height defaults to `var(--size-24)` and is overridable via `--calendar-expanded-cell-height`.

<ComponentPreview vertical height="680px">

```html
<bit-calendar expanded value="2025-06-15"></bit-calendar>
```

</ComponentPreview>

<ComponentPreview vertical height="680px">

```html
<bit-calendar expanded value="2025-06-15" color="primary"></bit-calendar>
```

</ComponentPreview>

## Disabled

<ComponentPreview vertical height="340px">

```html
<bit-calendar value="2025-06-15" disabled></bit-calendar>
```

</ComponentPreview>

## Localised

<ComponentPreview vertical height="340px">

```html
<div style="display:flex;gap:1rem;flex-wrap:wrap;">
  <bit-calendar locale="fr-FR" value="2025-06-15"></bit-calendar>
  <bit-calendar locale="ar-SA" value="2025-06-15"></bit-calendar>
</div>
```

</ComponentPreview>

## Inside a Form

<ComponentPreview vertical height="380px">

```html
<form id="booking-form">
  <bit-calendar name="appointment" value="2025-06-15" required></bit-calendar>
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

## API Reference

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Selected date in ISO 8601 format (`yyyy-MM-dd`) |
| `min` | `string` | — | Earliest selectable date (`yyyy-MM-dd`) |
| `max` | `string` | — | Latest selectable date (`yyyy-MM-dd`) |
| `weekend-days` | `number[]` | `[]` | JSON array of day-of-week indices to disable (0 = Sunday … 6 = Saturday). e.g. `[0,6]` for weekends |
| `locale` | `string` | browser locale | BCP 47 locale string for day/month names |
| `color` | `string` | — | Theme color: `primary` \| `secondary` \| `info` \| `success` \| `warning` \| `error` |
| `size` | `string` | `md` | Component size: `sm` \| `md` \| `lg` |
| `rounded` | `string` | — | Border radius override |
| `disabled` | `boolean` | `false` | Disable all interaction |
| `required` | `boolean` | `false` | Required field (form association) |
| `name` | `string` | — | Form field name |
| `events` | `CalendarEvent[]` | `[]` | Calendar events to display. Dots in normal mode, pills in expanded mode |
| `expanded` | `boolean` | `false` | Expanded calendar-app layout with tall cells and top-aligned day number circles |
| `fullwidth` | `boolean` | `false` | Expand calendar to full container width |

### CalendarEvent

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✓ | Unique identifier |
| `date` | `string` | ✓ | ISO 8601 date the event falls on (`yyyy-MM-dd`) |
| `label` | `string` | ✓ | Short label shown in the cell (pill text or tooltip for dot) |
| `color` | `string` | — | Any CSS color value. Falls back to the component's theme color |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | `{ isoValue: string \| null }` | Fired when a date is selected. `isoValue` is the ISO 8601 date string or `null` when cleared |

### CSS Custom Properties

| Property | Description |
|---|---|
| `--calendar-bg` | Calendar background colour |
| `--calendar-border-color` | Calendar border colour |
| `--calendar-radius` | Calendar border radius |
| `--calendar-shadow` | Calendar drop shadow |
| `--calendar-day-selected-bg` | Background of the selected day cell |
| `--calendar-day-today-color` | Colour of today's date number |
| `--calendar-day-outside-opacity` | Opacity of days outside the visible month |
| `--calendar-expanded-cell-height` | Minimum height of each day cell in the expanded layout (default `var(--size-24)`) |

### Parts

| Part | Description |
|---|---|
| `calendar` | The root calendar panel |
| `header` | Calendar header (nav buttons + label) |
| `grid` | The day grid |
| `day` | Individual day cell |

## Accessibility

`bit-calendar` is built with first-class accessibility:

- **Roles**: the host element carries `role="group"` and `aria-label` (the currently visible month/year). The day grid uses `role="grid"` with `role="gridcell"` on each day cell.
- **Selection state**: selected days have `aria-selected="true"`; unselected have `aria-selected="false"`.
- **Today**: today's cell has `aria-current="date"`.
- **Disabled cells**: out-of-range and weekend days have `aria-disabled="true"` and `tabindex="-1"` so they are skipped by keyboard navigation.
- **Keyboard navigation**:
  - `Enter` / `Space` — select focused day, month, or year cell
  - `ArrowRight` / `ArrowLeft` — move focus between adjacent day cells
  - Navigation buttons (`Previous` / `Next`) are standard `<button>` elements with descriptive `aria-label`
  - The header label button announces which view will open next (`"Switch to month view"`)
- **Disabled state**: when `disabled` is set, the host gets `aria-disabled="true"`, all cells are `tabindex="-1"`, and no interaction is processed.

## Related Components

- [Date Picker](/sigil/components/date-picker) — trigger + popup wrapper around the same calendar logic
