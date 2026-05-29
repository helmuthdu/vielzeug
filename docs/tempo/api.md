---
title: Tempo - API Reference
description: Complete API reference for @vielzeug/tempo date/time functions.
---

[[toc]]

## Package Entry Point

| Import             | Purpose                |
| ------------------ | ---------------------- |
| `@vielzeug/tempo`  | Main exports and types |

```ts
import {
  clamp,
  difference,
  endOf,
  formatDuration,
  formatHuman,
  formatInstant,
  formatRange,
  formatRelative,
  formatZoned,
  isAfter,
  isBefore,
  isSame,
  now,
  parseDuration,
  parseLocal,
  shift,
  startOf,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/tempo';
```

## API At a Glance

| Symbol                                | Purpose                                     | Execution mode | Common gotcha                                              |
| ------------------------------------- | ------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `now(tz)`                             | Get current zoned date/time                 | Sync           | Requires a valid IANA timezone string                      |
| `parseLocal(input)`                   | Parse a local date/time string              | Sync           | Returns `PlainDateTime` — no timezone attached             |
| `toInstant(input, options?)`          | Convert any input to a UTC instant          | Sync           | Ambiguous local times require `disambiguation` option      |
| `toZoned(input, options)`             | Convert to a specific timezone              | Sync           | Target timezone is required                                |
| `shift(input, duration, options)`     | Add/subtract duration from a date           | Sync           | Use negative duration values to subtract                   |
| `difference(start, end, options?)`    | Compute duration between two values         | Sync           | Requires a shared timezone or explicit `options.tz`        |
| `within(value, start, end, options?)` | Check if a date falls within a range        | Sync           | Range is inclusive by default                              |
| `isBefore/isAfter/isSame()`           | Compare two dates                           | Sync           | Comparison granularity set by `unit` option                |
| `startOf/endOf()`                     | Get boundary of a calendar unit             | Sync           | Week boundaries depend on locale settings                  |
| `formatHuman(input, options?)`        | Format as human-readable relative string    | Sync           | Output language depends on `locale` option                 |
| `formatInstant/formatZoned()`         | Format using Intl.DateTimeFormat            | Sync           | Requires locale-aware options for consistency              |
| `parseDuration()`                     | Parse ISO 8601 duration values              | Sync           | Duration strings must be valid ISO 8601 format             |
| `formatDuration(input, options?)`     | Format a duration for display               | Sync           | Falls back to ISO string if `Intl.DurationFormat` unavailable |

## Core Functions

### `now(tz): Temporal.ZonedDateTime`

Get current time in a target timezone.

```ts
now('Europe/Berlin');
```

### `parseLocal(input): Temporal.PlainDateTime`

Parse a local wall-clock string into a timezone-free `PlainDateTime`.

```ts
parseLocal('2026-03-21');
parseLocal('2026-03-21T10:15:30');
```

### `toInstant(input, options?): Temporal.Instant`

Normalize supported inputs to a canonical timeline value.

```ts
toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
toInstant(parseLocal('2026-03-21T10:15:30'), { tz: 'America/New_York' });
```

Notes:

- Plain local values require `options.tz`.

### `toZoned(input, options): Temporal.ZonedDateTime`

Render a time in a specific timezone.

```ts
toZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });
```

`options.tz` is required.

### `shift(input, duration, options): Temporal.ZonedDateTime`

DST-safe add/subtract helper.

```ts
shift(Temporal.Instant.from('2026-03-21T10:00:00Z'), { hours: -1 }, { tz: 'UTC' });
shift(Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]'), { hours: -1 });
```

Notes:

- `options.tz` is optional for zoned inputs and inferred from input timezone.
- `options.tz` is required for local/plain inputs.

### `difference(start, end, options?): Temporal.Duration`

Compute duration between two times.

```ts
difference(start, end, { largestUnit: 'hour', smallestUnit: 'minute' });
difference(start, end, { tz: 'UTC', largestUnit: 'hour', smallestUnit: 'minute' });
```

`options.tz` is optional when both values provide a shared timezone through zoned input.

## Query and Comparison

### `within(value, start, end, options?): boolean`

Inclusive range check with automatic bound normalization.

When `options.unit` is set, comparison happens on unit-aligned values in the chosen timezone.

### `clamp(value, start, end, options?): Temporal.Instant`

Clamp input to range bounds. Returns `Temporal.Instant` — project to any timezone as needed.

When `options.unit` is set, clamp is performed on unit-aligned instants (for example start-of-day), and the returned value is that aligned instant.

```ts
const clamped = clamp(value, start, end);
clamped.toZonedDateTimeISO('UTC');

const byDay = clamp(value, start, end, { unit: 'day', tz: 'America/New_York' });
```

### `isBefore(a, b, options?): boolean`

Returns true when `a < b` on timeline.

Set `options.unit` for calendar-unit comparison.

### `isAfter(a, b, options?): boolean`

Returns true when `a > b` on timeline.

Set `options.unit` for calendar-unit comparison.

### `isSame(a, b, options?): boolean`

Compares two values either on the timeline (when `unit` is omitted) or at a specific calendar unit (`'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'`).

```ts
isSame(a, b);
isSame(a, b, { unit: 'day', tz: 'America/New_York' });
isSame(a, b, { unit: 'month', tz: 'UTC' });
```

Timezone rules:

- Uses `options.tz` when provided.
- Otherwise infers from zoned inputs.
- Throws when zoned inputs disagree and `options.tz` is omitted.

## Boundary Helpers

### `startOf(input, unit, options): Temporal.ZonedDateTime`

Snap to start of a unit.

```ts
startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'week', { tz: 'UTC', weekStartsOn: 1 });
startOf(Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]'), 'day');
```

### `endOf(input, unit, options): Temporal.ZonedDateTime`

Snap to end of a unit (`startOf(nextUnit) - 1ns`).

```ts
endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
```

For zoned inputs, `options.tz` is optional and inferred from input timezone.

Supported units:

- `'minute'`
- `'hour'`
- `'day'`
- `'week'`
- `'month'`
- `'year'`

## Formatting

### `formatHuman(input, options?): string`

Localized UI formatting with presets.

```ts
formatHuman(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
  pattern: 'short',
  locale: 'en-GB',
  tz: 'UTC',
});
```

Patterns:

- `'short'`
- `'medium'` (default)
- `'long'`
- `'date-only'`
- `'time-only'`

### `formatInstant(input, options?): string`

Produces a UTC ISO-8601 instant string.

```ts
formatInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
// → '2026-03-21T10:15:30Z'
```

### `formatZoned(input, options?): string`

Produces a zoned ISO-8601 string. Infers timezone from `ZonedDateTime` inputs; requires `options.tz` otherwise.

```ts
formatZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });
// → '2026-03-21T11:15:30+01:00[Europe/Berlin]'

formatZoned(Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]'));
// → '2026-03-21T10:15:30+01:00[Europe/Berlin]'
```

### `formatRange(start, end, options?): string`

Localized range formatting via `Intl.DateTimeFormat.formatRange`.

### `formatRelative(input, options?): string`

Relative text using `Intl.RelativeTimeFormat`.

Accepted input types are `Temporal.Instant` and `Temporal.ZonedDateTime`.

```ts
formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
  base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
  numeric: 'always',
});
// => "in 2 hours"
```

## Duration Helpers

### `parseDuration(input): Temporal.Duration`

Parse ISO or object input into `Temporal.Duration`.

```ts
parseDuration('PT2H30M');
parseDuration({ hours: 2, minutes: 30 });
```

### `formatDuration(input, options?): string`

Format a duration for display. Uses `Intl.DurationFormat` when available (with `locale`/`style`); falls back to the ISO string representation otherwise.

```ts
formatDuration('PT2H30M');
formatDuration('PT2H30M', { locale: 'en-US', style: 'short' });
formatDuration({ hours: 1, minutes: 30 }, { locale: 'de-DE' });
```

## Types

```ts
type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
```
