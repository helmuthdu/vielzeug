---
title: Timit — API Reference
description: Complete API reference for @vielzeug/timit date/time functions.
---

# Timit API Reference

[[toc]]

## At a Glance

| Method | Category | Returns |
|--------|----------|---------|
| `timit.now(tz?)` | Query | `Temporal.ZonedDateTime` |
| `timit.parse(input)` | Conversion | `Temporal.PlainDateTime` |
| `timit.toInstant(input, options?)` | Conversion | `Temporal.Instant` |
| `timit.toZoned(input, options?)` | Conversion | `Temporal.ZonedDateTime` |
| `timit.add(input, duration, options?)` | Arithmetic | `Temporal.ZonedDateTime` |
| `timit.difference(start, end, options?)` | Arithmetic | `Temporal.Duration` |
| `timit.within(input, start, end, options?)` | Query | `boolean` |
| `timit.format(input, options?)` | Formatting | `string` |
| `timit.formatIso(input, options?)` | Formatting | `string` |
| `timit.formatRange(start, end, options?)` | Formatting | `string` |

## Namespace Import

```ts
import { timit } from '@vielzeug/timit';
```

All methods live on the `timit` object. Destructure for short names in a local scope:

```ts
const { add, format, now } = timit;
```

## Functions

### Conversion Functions

#### `parse(input): Temporal.PlainDateTime`

Parse a plain local date/time string into a `Temporal.PlainDateTime`.

```ts
timit.parse('2026-03-21');
timit.parse('2026-03-21T10:15:30');
```

Parameters:
- `input: string`

Returns: `Temporal.PlainDateTime`

#### `toInstant(input, options?): Temporal.Instant`

Normalize any supported input to a canonical timeline value.

```ts
timit.toInstant('2026-03-21T10:15:30Z');
timit.toInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });
timit.toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.Instant`

Notes:
- Plain local values require `options.tz`.
- Zoned strings with bracketed zone annotations (for example `2026-03-21T10:15:30[America/New_York]`) are resolved using their embedded timezone.
- ISO strings with explicit offsets (for example `+02:00` or `Z`) are parsed as absolute instants; `options.tz` does not reinterpret them.
- Invalid strings throw a dedicated parse error.
- `options.when` only applies when resolving local wall-clock values to an instant.

#### `toZoned(input, options?): Temporal.ZonedDateTime`

View a time in a specific timezone.

```ts
timit.toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

Notes:
- Plain local values (for example `Temporal.PlainDate.from('2026-03-21')`, `2026-03-21`, or `2026-03-21T10:15`) are interpreted in `options.tz`.
- Zoned strings with bracketed zone annotations preserve their original instant and can optionally be displayed in `options.tz`.
- Offset-bearing strings are first parsed as absolute instants, then displayed in the target timezone.

### Arithmetic Functions

#### `add(input, duration, options?): Temporal.ZonedDateTime`

Add or subtract duration in one API.

```ts
timit.add('2026-03-21T10:00:00Z', { hours: 2 });
timit.add('2026-03-21T10:00:00Z', { hours: -1 });
```

Parameters:
- `input: TimeInput`
- `duration: Temporal.DurationLike`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

Notes:
- For absolute inputs (for example `Z`/offset strings or `Temporal.Instant`) without `options.tz`, output is viewed in the system timezone.

#### `difference(start, end, options?): Temporal.Duration`

Compute duration between two times with optional rounding.

```ts
timit.difference(start, end, { largestUnit: 'hour', smallestUnit: 'minute' });
```

Parameters:
- `start: TimeInput`
- `end: TimeInput`
- `options?: DifferenceOptions`

Returns: `Temporal.Duration`

### Query Functions

#### `now(tz?): Temporal.ZonedDateTime`

Get the current time in the given timezone (or system timezone).

```ts
timit.now();
timit.now('America/New_York');
```

#### `within(input, start, end, options?): boolean`

Check whether `input` is within an inclusive range.

```ts
timit.within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');
```

Notes:
- Bounds are normalized automatically, so reversed `start`/`end` still work.

### Formatting Functions

#### `format(input, options?): string`

Format localized, user-facing output.

```ts
timit.format('2026-03-21T10:15:30Z', {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
```

Pattern options:
- `'short'`
- `'medium'` (default)
- `'long'`
- `'date-only'`
- `'time-only'`

#### `formatIso(input, options?): string`

Format canonical ISO-8601 output for logs and APIs.

```ts
timit.formatIso('2026-03-21T10:15:30Z');
// => "2026-03-21T10:15:30Z"
```

#### `formatRange(start, end, options?): string`

Format a localized range using `Intl.DateTimeFormat.formatRange`.

```ts
timit.formatRange(start, end, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
```

## Types

### `TimeInput`

```ts
type TimeInput =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | string;
```

### `TimeOptions`

```ts
interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}
```

### `DifferenceOptions`

```ts
interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}
```

### `HumanFormatOptions`

```ts
interface HumanFormatOptions {
  pattern?: 'short' | 'medium' | 'long' | 'date-only' | 'time-only';
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions;
}
```

### `TimeOptionsWithTz`

Convenience alias requiring `tz`. Enforced by TypeScript overloads on `toInstant` and `toZoned` for plain-local inputs.

```ts
type TimeOptionsWithTz = TimeOptions & { tz: string };
```

### `DateTimeDisambiguation`

```ts
type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
```

Used in `options.when` to resolve ambiguous wall-clock times during DST fall-back transitions. `'compatible'` is the Temporal default.

### `FormatPattern`

```ts
type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';
```
