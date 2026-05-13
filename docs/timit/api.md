---
title: Timit - API Reference
description: Complete API reference for @vielzeug/timit date/time functions.
---

[[toc]]

## Import

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
  isSameDay,
  now,
  parseDuration,
  parseLocal,
  shift,
  startOf,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/timit';
```

## At a Glance

| Method | Category | Returns |
| ------ | -------- | ------- |
| `now(tz)` | Query | `Temporal.ZonedDateTime` |
| `parseLocal(input)` | Conversion | `Temporal.PlainDateTime` |
| `toInstant(input, options?)` | Conversion | `Temporal.Instant` |
| `toZoned(input, options)` | Conversion | `Temporal.ZonedDateTime` |
| `shift(input, duration, options)` | Arithmetic | `Temporal.ZonedDateTime` |
| `difference(start, end, options)` | Arithmetic | `Temporal.Duration` |
| `within(value, start, end, options?)` | Query | `boolean` |
| `clamp(value, start, end, options?)` | Query | `Temporal.Instant` |
| `isBefore(a, b, options?)` | Comparison | `boolean` |
| `isAfter(a, b, options?)` | Comparison | `boolean` |
| `isSameDay(a, b, options?)` | Comparison | `boolean` |
| `startOf(input, unit, options)` | Boundary | `Temporal.ZonedDateTime` |
| `endOf(input, unit, options)` | Boundary | `Temporal.ZonedDateTime` |
| `formatHuman(input, options?)` | Formatting | `string` |
| `formatInstant(input, options?)` | Formatting | `string` |
| `formatZoned(input, options?)` | Formatting | `string` |
| `formatRange(start, end, options?)` | Formatting | `string` |
| `formatRelative(input, options?)` | Formatting | `string` |
| `parseDuration(input)` | Duration | `Temporal.Duration` |
| `formatDuration(input, options?)` | Duration | `string` |

## Core Functions

### `now(tz): Temporal.ZonedDateTime`

Get current time in a target timezone.

```ts
now('Europe/Berlin');
```

### `parseLocal(input): Temporal.PlainDateTime`

Parse a local wall-clock string.

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
- Core APIs are Temporal-first; string parsing is intentionally explicit via `parseLocal`.

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

### `difference(start, end, options): Temporal.Duration`

Compute duration between two times.

```ts
difference(start, end, { tz: 'UTC', largestUnit: 'hour', smallestUnit: 'minute' });
```

`options.tz` is required.

## Query and Comparison

### `within(value, start, end, options?): boolean`

Inclusive range check with automatic bound normalization.

### `clamp(value, start, end, options?): Temporal.Instant`

Clamp input to range bounds. Returns `Temporal.Instant` — project to any timezone as needed.

```ts
const clamped = clamp(value, start, end);
clamped.toZonedDateTimeISO('UTC');
```

### `isBefore(a, b, options?): boolean`

Returns true when `a < b` on timeline.

### `isAfter(a, b, options?): boolean`

Returns true when `a > b` on timeline.

### `isSameDay(a, b, options): boolean`

Compares wall-clock day. Infers timezone from `ZonedDateTime` inputs; requires `options.tz` for non-zoned inputs. Throws when inputs are zoned in different timezones without explicit `options.tz`.

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

Format duration for display. By default returns ISO (`duration.toString()`); with `locale`/`style` it uses `Intl.DurationFormat` when available.

```ts
formatDuration('PT2H30M');
formatDuration('PT2H30M', { locale: 'en-US', style: 'short' });
```

## Types

```ts
type TimeInput =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;
```
