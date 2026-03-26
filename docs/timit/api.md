---
title: Timit — API Reference
description: Complete API reference for @vielzeug/timit date/time functions.
---

# Timit API Reference

[[toc]]

## Namespace Object

### `t` — Date/time operations

All functions are grouped under the `t` namespace for discoverability and autocomplete.

```ts
import { t } from '@vielzeug/timit';

t.now('UTC');
t.parseLocal('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });
t.toInstant(input, { tz: 'Europe/Berlin' });
t.toZoned(instant, { tz: 'America/New_York' });
t.shift(time, { hours: 1 });
t.diff(start, end);
t.within(value, start, end);
t.formatHuman(time, { pattern: 'short' });
t.formatISO(time);
t.formatRange(start, end, { pattern: 'short' });
```

You can also import functions individually:

```ts
import { formatHuman, shift, toInstant } from '@vielzeug/timit';
```

## Functions

### Conversion Functions

#### `t.parseLocal(input, options): Temporal.ZonedDateTime`

Parse a plain local date/time string using an explicit timezone.

```ts
t.parseLocal('2026-03-21T10:15:30', { tz: 'America/New_York' });
```

Parameters:
- `input: string` — Plain local date/time string without offset
- `options: LocalTimeOptions` — Requires `tz`; optional `when` disambiguation

Returns: `Temporal.ZonedDateTime`

#### `t.toInstant(input, options?): Temporal.Instant`

Normalize any supported input to a canonical timeline value.

```ts
t.toInstant('2026-03-21T10:15:30Z');
t.toInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });
t.toInstant(new Date());
t.toInstant(1711011330000);
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.Instant`

Notes:
- Plain local strings require `options.tz`.
- Invalid strings throw a dedicated parse error.

#### `t.toZoned(input, options?): Temporal.ZonedDateTime`

View a time in a specific timezone.

```ts
t.toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });
```

Parameters:
- `input: TimeInput`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

### Arithmetic Functions

#### `t.shift(input, duration, options?): Temporal.ZonedDateTime`

Add or subtract duration in one API.

```ts
t.shift('2026-03-21T10:00:00Z', { hours: 2 });
t.shift('2026-03-21T10:00:00Z', { hours: -1 });
```

Parameters:
- `input: TimeInput`
- `duration: Temporal.DurationLike`
- `options?: TimeOptions`

Returns: `Temporal.ZonedDateTime`

#### `t.diff(start, end, options?): Temporal.Duration`

Compute duration between two times with optional rounding.

```ts
t.diff(start, end, { largestUnit: 'hour', smallestUnit: 'minute' });
```

Parameters:
- `start: TimeInput`
- `end: TimeInput`
- `options?: DifferenceOptions`

Returns: `Temporal.Duration`

### Query Functions

#### `t.now(tz?): Temporal.ZonedDateTime`

Get the current time in the given timezone (or system timezone).

```ts
t.now();
t.now('America/New_York');
```

#### `t.within(input, start, end, options?): boolean`

Check whether `input` is within an inclusive range.

```ts
t.within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');
```

Notes:
- Bounds are normalized automatically, so reversed `start`/`end` still work.

### Formatting Functions

#### `t.formatHuman(input, options?): string`

Format localized, user-facing output.

```ts
t.formatHuman('2026-03-21T10:15:30Z', {
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

#### `t.formatISO(input, options?): string`

Format canonical ISO-8601 output for logs and APIs.

```ts
t.formatISO('2026-03-21T10:15:30Z');
// => "2026-03-21T10:15:30Z"
```

#### `t.formatRange(start, end, options?): string`

Format a localized range using `Intl.DateTimeFormat.formatRange` when available.

```ts
t.formatRange(start, end, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
```

## Types

### `TimeInput`

```ts
type TimeInput =
  | Date
  | Temporal.Instant
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | number
  | string;
```

### `TimeOptions`

```ts
interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}
```

### `LocalTimeOptions`

```ts
interface LocalTimeOptions {
  tz: string;
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
