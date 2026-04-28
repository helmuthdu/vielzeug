---
title: Timit — API Reference
description: Complete API reference for @vielzeug/timit date/time functions.
---

# Timit API Reference

[[toc]]

## Import Style

Timit supports both named exports and a convenience `d` namespace.

```ts
import {
  diff,
  formatHuman,
  formatISO,
  formatRange,
  now,
  shift,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/timit';

now('UTC');
toInstant(input, { tz: 'Europe/Berlin' });
toZoned(instant, { tz: 'America/New_York' });
shift(time, { hours: 1 });
diff(start, end);
within(value, start, end);
formatHuman(time, { pattern: 'short' });
formatISO(time);
formatRange(start, end, { pattern: 'short' });
```

Convenience namespace:

```ts
import { d } from '@vielzeug/timit';

d.now('UTC');
d.toInstant(input, { tz: 'Europe/Berlin' });
d.toZoned(instant, { tz: 'America/New_York' });
d.shift(time, { hours: 1 });
d.diff(start, end);
d.within(value, start, end);
d.formatHuman(time, { pattern: 'short' });
d.formatISO(time);
d.formatRange(start, end, { pattern: 'short' });
```

For bundle-size-sensitive code, prefer named exports so bundlers can tree-shake unused helpers.

## Functions

### Conversion Functions

#### `toInstant(input, options?): Temporal.Instant`

Normalize any supported input to a canonical timeline value.

```ts
toInstant('2026-03-21T10:15:30Z');
toInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });
toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.Instant`

Notes:
- Plain local strings require `options.tz`.
- Zoned strings with bracketed zone annotations (for example `2026-03-21T10:15:30[America/New_York]`) are resolved using their embedded timezone.
- ISO strings with explicit offsets (for example `+02:00` or `Z`) are parsed as absolute instants; `options.tz` does not reinterpret them.
- Invalid strings throw a dedicated parse error.
- `options.when` only applies when resolving local wall-clock values to an instant.

#### `toZoned(input, options?): Temporal.ZonedDateTime`

View a time in a specific timezone.

```ts
toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

Notes:
- Plain local strings (for example `2026-03-21` or `2026-03-21T10:15`) are interpreted in `options.tz`.
- Zoned strings with bracketed zone annotations preserve their original instant and can optionally be displayed in `options.tz`.
- Offset-bearing strings are first parsed as absolute instants, then displayed in the target timezone.

### Arithmetic Functions

#### `shift(input, duration, options?): Temporal.ZonedDateTime`

Add or subtract duration in one API.

```ts
shift('2026-03-21T10:00:00Z', { hours: 2 });
shift('2026-03-21T10:00:00Z', { hours: -1 });
```

Parameters:
- `input: TimeInput`
- `duration: Temporal.DurationLike`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

#### `diff(start, end, options?): Temporal.Duration`

Compute duration between two times with optional rounding.

```ts
diff(start, end, { largestUnit: 'hour', smallestUnit: 'minute' });
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
now();
now('America/New_York');
```

#### `within(input, start, end, options?): boolean`

Check whether `input` is within an inclusive range.

```ts
within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');
```

Notes:
- Bounds are normalized automatically, so reversed `start`/`end` still work.

### Formatting Functions

#### `formatHuman(input, options?): string`

Format localized, user-facing output.

```ts
formatHuman('2026-03-21T10:15:30Z', {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
```

Pattern options:
- `'short'`
- `'long'`
- `'date-only'`
- `'time-only'`

#### `formatISO(input, options?): string`

Format canonical ISO-8601 output for logs and APIs.

```ts
formatISO('2026-03-21T10:15:30Z');
// => "2026-03-21T10:15:30Z"
```

#### `formatRange(start, end, options?): string`

Format a localized range using `Intl.DateTimeFormat.formatRange` when available.

```ts
formatRange(start, end, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
```

## Types

### `TimeInput`

```ts
type TimeInput =
  | Temporal.Instant
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
  pattern?: 'short' | 'long' | 'date-only' | 'time-only';
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions;
}
```

## Temporal Export

```ts
import { Temporal } from '@vielzeug/timit';
```

`Temporal` is re-exported from `@js-temporal/polyfill` for advanced use cases.

It is also available on the namespace import as `d.Temporal`.
