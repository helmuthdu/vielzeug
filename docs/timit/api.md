---
title: Timit — API Reference
description: Complete API reference for @vielzeug/timit date/time functions.
---

# Timit API Reference

[[toc]]

## Namespace Object

### `d` — Date/time operations

All functions are grouped under the `d` namespace for better discoverability and IDE autocomplete (similar to Validit's `v` pattern).

```ts
import { d } from '@vielzeug/timit';

d.now('UTC');
d.asInstant(input);
d.asZoned(instant);
d.add(time, duration);
d.subtract(time, duration);
d.diff(start, end);
d.within(value, start, end);
d.format(time, options);
d.formatRange(start, end, options);
```

You can also import functions individually for tree-shaking:

```ts
import { add, format, now } from '@vielzeug/timit';
```

## Functions

### Conversion Functions

#### `d.asInstant(input, options?): Temporal.Instant`

Normalize any time input to a canonical timeline value (Instant) ignoring timezone.

```ts
d.asInstant('2026-03-21T10:15:30Z');
d.asInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });
d.asInstant(new Date());
d.asInstant(1711011330000); // epoch ms
```

**Parameters:**
- `input: TimeInput` — Date, Instant, PlainDateTime, ZonedDateTime, number (epoch ms), or ISO string
- `options?: TimeOptions` — Optional timezone and disambiguation options

**Returns:** `Temporal.Instant` — Timeline value

#### `d.asZoned(input, options?): Temporal.ZonedDateTime`

View a time in a specific timezone, preserving the moment but changing wall-clock representation.

```ts
d.asZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });
```

**Parameters:**
- `input: TimeInput` — Any supported time input
- `options?: TimeOptions` — Timezone and disambiguation options

**Returns:** `Temporal.ZonedDateTime` — Zoned date-time

### Arithmetic Functions

#### `d.add(input, duration, options?): Temporal.ZonedDateTime`

Add a duration to a time. DST transitions are handled automatically.

```ts
d.add('2026-03-21T10:00:00Z', { hours: 2, minutes: 30 });
```

**Parameters:**
- `input: TimeInput` — Time to add to
- `duration: Temporal.DurationLike` — Duration to add
- `options?: TimeOptions` — Optional timezone and disambiguation

**Returns:** `Temporal.ZonedDateTime` — Result time

#### `d.subtract(input, duration, options?): Temporal.ZonedDateTime`

Subtract a duration from a time. DST transitions are handled automatically.

```ts
d.subtract(meeting, { minutes: 15 });
```

**Parameters:**
- `input: TimeInput` — Time to subtract from
- `duration: Temporal.DurationLike` — Duration to subtract
- `options?: TimeOptions` — Optional timezone and disambiguation

**Returns:** `Temporal.ZonedDateTime` — Result time

#### `d.diff(start, end, options?): Temporal.Duration`

Compute the duration between two times with optional rounding.

```ts
d.diff(start, end, { largestUnit: 'hours', smallestUnit: 'minutes' });
```

**Parameters:**
- `start: TimeInput` — Start time
- `end: TimeInput` — End time
- `options?: DifferenceOptions` — Duration granularity and timezone options

**Returns:** `Temporal.Duration` — Duration between times

### Query Functions

#### `d.now(tz?): Temporal.ZonedDateTime`

Get the current time in the specified timezone (defaults to system timezone).

```ts
d.now();                    // system timezone
d.now('America/New_York');  // Eastern Time
```

**Parameters:**
- `tz?: string` — Time zone ID (optional, uses system if not provided)

**Returns:** `Temporal.ZonedDateTime` — Current time in specified timezone

#### `d.within(input, start, end, options?): boolean`

Check if a time falls within an inclusive range.

```ts
d.within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z'); // true
```

**Parameters:**
- `input: TimeInput` — Time to check
- `start: TimeInput` — Range start (inclusive)
- `end: TimeInput` — Range end (inclusive)
- `options?: TimeOptions` — Optional timezone options

**Returns:** `boolean` — True if input is within range

### Formatting Functions

#### `d.format(input, options?): string`

Format a time as a human-readable string with preset patterns.

```ts
d.format(instant, { pattern: 'short', locale: 'en-US' });
```

**Parameters:**
- `input: TimeInput` — Time to format
- `options?: FormatOptions` — Pattern, locale, timezone, and advanced options

**Returns:** `string` — Formatted time string

**Format Patterns:**
- `'short'` — Compact (e.g., "21/03/2026, 10:15")
- `'long'` — Expanded (e.g., "Saturday, March 21, 2026, 10:15:30")
- `'iso'` — Full ISO style
- `'date-only'` — Just the date
- `'time-only'` — Just the time

#### `d.formatRange(start, end, options?): string`

Format a time span using browser `Intl.formatRange` (with fallback).

```ts
d.formatRange(start, end, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
```

**Parameters:**
- `start: TimeInput` — Range start time
- `end: TimeInput` — Range end time
- `options?: FormatOptions` — Formatting options

**Returns:** `string` — Formatted range string

## Types

### `TimeInput`

```typescript
type TimeInput =
  | Date
  | Temporal.Instant
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | number           // epoch milliseconds
  | string;          // ISO string or plain datetime (requires tz option)
```

### `TimeOptions`

```typescript
interface TimeOptions {
  tz?: string;              // Time zone ID (e.g., 'America/New_York')
  when?: DateTimeDisambiguation; // 'compatible' | 'earlier' | 'later' | 'reject'
}
```

### `DifferenceOptions`

```typescript
interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}
```

### `FormatOptions`

```typescript
interface FormatOptions {
  pattern?: FormatPattern; // 'iso' | 'short' | 'long' | 'date-only' | 'time-only'
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions; // Advanced escape hatch
}
```

## Temporal Export

```ts
import { Temporal } from '@vielzeug/timit';

const zdt = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');
```

Re-export of `@js-temporal/polyfill` for advanced Temporal operations not covered by Timit helpers.

## Notes

- Plain strings without timezone/offset require `options.tz`
- `d.asZoned()` preserves timeline identity when converting zones
- All functions are timezone-aware; manually handle DST if not using provided helpers
- Format presets use `Intl.DateTimeFormat` with the specified locale and timezone

