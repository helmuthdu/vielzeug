---
title: Tempo — API Reference
description: Complete API reference for @vielzeug/tempo date/time functions.
---

[[toc]]

## API At a Glance

| Symbol                                 | Purpose                                           | Execution mode | Common gotcha                                                  |
| -------------------------------------- | ------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `now(tz)`                              | Current zoned date/time                           | Sync           | Requires a valid IANA timezone string                          |
| `parseLocal(input)`                    | Parse a wall-clock string                         | Sync           | Returns `PlainDateTime` — no timezone attached                 |
| `toInstant(input, options?)`           | Normalize any input to a UTC instant              | Sync           | Plain inputs require `options.tz`                              |
| `toZoned(input, options)`              | Project a time into a specific timezone           | Sync           | `options.tz` is required                                       |
| `shift(input, duration, options?)`     | DST-safe add/subtract                             | Sync           | `options.tz` required for plain/instant inputs                 |
| `difference(start, end, options?)`     | Duration between two values                       | Sync           | Requires `tz` only for calendar units or plain inputs          |
| `within(value, start, end, options?)`  | Inclusive range check                             | Sync           | Bounds auto-normalized; use `unit` for calendar checks         |
| `clamp(value, start, end, options?)`   | Clamp to range; returns `Temporal.Instant`        | Sync           | With `unit`, returns unit-aligned instant, not original value  |
| `isBefore(a, b, options?)`             | Returns `true` when `a` is earlier than `b`       | Sync           | Omit `unit` for raw timeline comparison                        |
| `isAfter(a, b, options?)`              | Returns `true` when `a` is later than `b`         | Sync           | Omit `unit` for raw timeline comparison                        |
| `isSame(a, b, options?)`               | Returns `true` when `a` and `b` are equal         | Sync           | Set `unit` for calendar-unit equality                          |
| `startOf(input, unit, options?)`       | Snap to start of a calendar unit                  | Sync           | Week boundaries depend on `weekStartsOn` (default Monday)      |
| `endOf(input, unit, options?)`         | Snap to end of a calendar unit                    | Sync           | Returns 1 nanosecond before the next unit starts               |
| `format(input, options?)`              | Localized display formatting with presets         | Sync           | `intl` takes precedence over `pattern` when both are set       |
| `formatInstant(input, options?)`       | UTC ISO-8601 instant string                       | Sync           | Always UTC regardless of input zone                            |
| `formatZoned(input, options?)`         | Zoned ISO-8601 string                             | Sync           | `options.tz` required for non-zoned inputs                     |
| `formatRange(start, end, options?)`    | Localized time-span string                        | Sync           | Throws when zoned inputs are in different zones without `tz`   |
| `formatRelative(input, options?)`      | UX relative text ("in 2 hours", "3 days ago")     | Sync           | Input restricted to `Instant` or `ZonedDateTime`               |
| `parseDuration(input)`                 | Parse ISO 8601 duration or `DurationLike` object  | Sync           | Throws `TypeError` for invalid strings                         |
| `formatDuration(input, options?)`      | Format a duration for display                     | Sync           | Falls back to ISO string if `Intl.DurationFormat` unavailable  |
| `expires(date, days?, options?)`       | Classify date as EXPIRED / SOON / LATER / NEVER   | Sync           | Plain inputs default to UTC; pass `options.tz` to override     |
| `timeDiff(a, b?, options?)`            | Largest-unit difference as `{ unit, value }`      | Sync           | Month/year use 30-day/365-day approximations                   |
| `dateRange(start, end, step, options)` | Generate array of `ZonedDateTime` values          | Sync           | `step` must advance time forward; `options.tz` required        |
| `clearCaches()`                        | Release internal `Intl` formatter caches          | Sync           | Useful in tests or memory-constrained environments             |

## Package Entry Point

| Import            | Purpose                |
| ----------------- | ---------------------- |
| `@vielzeug/tempo` | Main exports and types |

```ts
import {
  clamp,
  clearCaches,
  dateRange,
  difference,
  endOf,
  expires,
  format,
  formatDuration,
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
  timeDiff,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/tempo';
```

## Core Functions

### `now(tz): Temporal.ZonedDateTime`

```ts
now(tz: string): Temporal.ZonedDateTime;
```

Returns the current time as a `ZonedDateTime` in `tz`.

**Example:**

```ts
import { now } from '@vielzeug/tempo';

now('UTC');
now('Europe/Berlin');
now('Asia/Tokyo');
```

---

### `parseLocal(input): Temporal.PlainDateTime`

```ts
parseLocal(input: string): Temporal.PlainDateTime;
```

Parses an ISO 8601 date or date-time string into a timezone-free `PlainDateTime`. Use this at the boundary where user input or database values arrive as wall-clock strings.

**Example:**

```ts
import { parseLocal } from '@vielzeug/tempo';

parseLocal('2026-03-21');           // 2026-03-21T00:00:00
parseLocal('2026-03-21T10:15:30'); // 2026-03-21T10:15:30
```

---

### `toInstant(input, options?): Temporal.Instant`

```ts
toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
```

Normalizes any `TimeInput` to an absolute `Temporal.Instant`.

**Parameters — `TimeOptions`:**

| Option | Type                     | Default        | Description                                        |
| ------ | ------------------------ | -------------- | -------------------------------------------------- |
| `tz`   | `string`                 | —              | Required when input is `PlainDate`/`PlainDateTime` |
| `when` | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation for ambiguous local times       |

**Example:**

```ts
import { parseLocal, toInstant } from '@vielzeug/tempo';

toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
toInstant(parseLocal('2026-03-21T10:15:30'), { tz: 'America/New_York' });
toInstant(parseLocal('2026-11-01T01:30:00'), { tz: 'America/New_York', when: 'earlier' });
```

---

### `toZoned(input, options): Temporal.ZonedDateTime`

```ts
toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime;
```

Projects any `TimeInput` into `options.tz`.

**Example:**

```ts
import { toZoned } from '@vielzeug/tempo';

toZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });
```

---

### `shift(input, duration, options?): Temporal.ZonedDateTime`

```ts
shift(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
```

Adds `duration` to `input` using DST-aware calendar arithmetic. Negative values subtract.

**Parameters — `TimeOptions`:**

| Option | Type                     | Default        | Description                                           |
| ------ | ------------------------ | -------------- | ----------------------------------------------------- |
| `tz`   | `string`                 | —              | Required for plain/instant inputs; inferred for zoned |
| `when` | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation                                    |

**Example:**

```ts
import { shift } from '@vielzeug/tempo';

// Zoned input — timezone inferred
shift(Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]'), { hours: 1 });
// → 2026-03-08T03:30:00-04:00[America/New_York]  (DST spring-forward handled)

// Instant input — timezone required
shift(Temporal.Instant.from('2026-03-21T10:00:00Z'), { days: 1 }, { tz: 'UTC' });
```

---

### `difference(start, end, options?): Temporal.Duration`

```ts
difference(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;
```

Returns the signed duration from `start` to `end`. When `start > end` the result is negative.

**Parameters — `DifferenceOptions`:**

| Option              | Type                     | Default        | Description                                        |
| ------------------- | ------------------------ | -------------- | -------------------------------------------------- |
| `tz`                | `string`                 | —              | Required for plain inputs or calendar units        |
| `largestUnit`       | `Temporal.DateTimeUnit`  | `'second'`     | Largest unit in the returned duration              |
| `smallestUnit`      | `Temporal.DateTimeUnit`  | `'second'`     | Smallest unit; excess is rounded                   |
| `roundingMode`      | `Temporal.RoundingMode`  | `'trunc'`      | Rounding direction for `smallestUnit`              |
| `roundingIncrement` | `number`                 | `1`            | Rounding granularity for `smallestUnit`            |
| `when`              | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation                                 |

Two `Temporal.Instant` inputs with sub-day `largestUnit`/`smallestUnit` do not need `tz`. Calendar units (`day`, `week`, `month`, `year`) always require `tz`.

**Example:**

```ts
import { difference } from '@vielzeug/tempo';

// Instant-to-instant, sub-day units — no tz needed
difference(
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:30:00Z'),
  { largestUnit: 'hour', smallestUnit: 'minute' },
); // PT2H30M

// Calendar units always require tz
difference(
  Temporal.Instant.from('2026-03-21T00:00:00Z'),
  Temporal.Instant.from('2026-03-28T00:00:00Z'),
  { largestUnit: 'day', tz: 'UTC' },
);
```

## Query and Comparison

### `within(value, start, end, options?): boolean`

```ts
within(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `value` falls within `[start, end]` (inclusive). Bounds are automatically normalized, so `within(v, hi, lo)` behaves the same as `within(v, lo, hi)`.

Set `options.unit` to compare on calendar-unit boundaries (e.g., same day, same week).

**Example:**

```ts
import { within } from '@vielzeug/tempo';

const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

within(Temporal.Instant.from('2026-03-21T11:00:00Z'), lo, hi); // true
within(lo, lo, hi);                                              // true (inclusive)
within(Temporal.Instant.from('2026-03-22T05:00:00Z'), lo, hi, { unit: 'day', tz: 'UTC' }); // true
```

---

### `clamp(value, start, end, options?): Temporal.Instant`

```ts
clamp(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): Temporal.Instant;
```

Returns `value` clamped to `[start, end]`. Always returns a `Temporal.Instant` — project to a timezone with `.toZonedDateTimeISO()`.

With `options.unit`, the clamp operates on unit-aligned boundaries and the returned instant is the start of the clamped unit.

**Example:**

```ts
import { clamp } from '@vielzeug/tempo';

const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), lo, hi).toString(); // '2026-03-21T12:00:00Z'
clamp(Temporal.Instant.from('2026-03-23T05:00:00Z'), lo, hi, { unit: 'day', tz: 'America/New_York' });
```

---

### `isBefore(a, b, options?): boolean`

```ts
isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` is earlier than `b` on the timeline. Set `options.unit` for calendar-unit comparison.

**Example:**

```ts
import { isBefore } from '@vielzeug/tempo';

isBefore(
  Temporal.Instant.from('2026-03-21T23:30:00Z'),
  Temporal.Instant.from('2026-03-22T00:15:00Z'),
  { unit: 'day', tz: 'UTC' },
); // true — different UTC days
```

---

### `isAfter(a, b, options?): boolean`

```ts
isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` is later than `b` on the timeline. Set `options.unit` for calendar-unit comparison.

**Example:**

```ts
import { isAfter } from '@vielzeug/tempo';

isAfter(
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
); // true
```

---

### `isSame(a, b, options?): boolean`

```ts
isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` and `b` represent the same point or the same calendar unit. Infers timezone from `ZonedDateTime` inputs; throws when both are zoned in different zones and `options.tz` is omitted.

**Example:**

```ts
import { isSame } from '@vielzeug/tempo';

isSame(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T10:00:00Z')); // true

// Same calendar day in New York even though UTC dates differ
isSame(
  Temporal.Instant.from('2026-03-21T23:30:00Z'),
  Temporal.Instant.from('2026-03-22T00:15:00Z'),
  { unit: 'day', tz: 'America/New_York' },
); // true
```

## Boundary Helpers

### `startOf(input, unit, options?): Temporal.ZonedDateTime`

```ts
startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
```

Snaps `input` to the start of `unit`. For `ZonedDateTime` inputs, `options.tz` is inferred automatically.

**Parameters — `BoundaryOptions`:**

| Option         | Type           | Default | Description                           |
| -------------- | -------------- | ------- | ------------------------------------- |
| `tz`           | `string`       | —       | Required for non-zoned inputs         |
| `weekStartsOn` | `WeekStartDay` | `1`     | ISO weekday (1 = Monday, 7 = Sunday)  |

Supported units: `'minute'` · `'hour'` · `'day'` · `'week'` · `'month'` · `'year'`

**Example:**

```ts
import { startOf } from '@vielzeug/tempo';

startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
// → 2026-03-21T00:00:00+00:00[UTC]

startOf(Temporal.Instant.from('2026-03-25T12:00:00Z'), 'week', { tz: 'UTC', weekStartsOn: 1 });
// → 2026-03-23T00:00:00+00:00[UTC]  (Monday)
```

---

### `endOf(input, unit, options?): Temporal.ZonedDateTime`

```ts
endOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
```

Snaps `input` to the last nanosecond of `unit` (`startOf(nextUnit) - 1ns`).

**Example:**

```ts
import { endOf } from '@vielzeug/tempo';

endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
// → 2026-03-21T23:59:59.999999999+00:00[UTC]
```

## Formatting

### `format(input, options?): string`

```ts
format(input: TimeInput, options?: FormatOptions): string;
```

Formats `input` for display using `Intl.DateTimeFormat`. Use `pattern` for common presets or `intl` for a custom `Intl.DateTimeFormatOptions`. When both are present, `intl` takes precedence and `pattern` is ignored.

**Parameters — `FormatOptions`:**

| Option    | Type                         | Default       | Description                                               |
| --------- | ---------------------------- | ------------- | --------------------------------------------------------- |
| `pattern` | `FormatPattern`              | `'medium'`    | Preset shorthand                                          |
| `intl`    | `Intl.DateTimeFormatOptions` | —             | Full `Intl` spec; overrides `pattern` when present        |
| `locale`  | `Intl.LocalesArgument`       | system locale | BCP 47 locale tag                                         |
| `tz`      | `string`                     | —             | Inferred from `ZonedDateTime` inputs; required otherwise  |

**Patterns:**

| Pattern       | Equivalent                                    |
| ------------- | --------------------------------------------- |
| `'short'`     | `{ dateStyle: 'short', timeStyle: 'short' }`  |
| `'medium'`    | `{ dateStyle: 'medium', timeStyle: 'short' }` |
| `'long'`      | `{ dateStyle: 'full', timeStyle: 'long' }`    |
| `'date-only'` | `{ dateStyle: 'short' }`                      |
| `'time-only'` | `{ timeStyle: 'short' }`                      |

**Example:**

```ts
import { format } from '@vielzeug/tempo';

format(Temporal.Instant.from('2026-03-21T10:15:30Z'), { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
// → '21/03/2026, 10:15'

// Escape hatch: full Intl spec
format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
  intl: { hour: '2-digit', minute: '2-digit', hour12: false },
  locale: 'en-US',
  tz: 'UTC',
});
// → '10:15'
```

---

### `formatInstant(input, options?): string`

```ts
formatInstant(input: TimeInput, options?: TimeOptions): string;
```

Returns a UTC ISO-8601 instant string (`YYYY-MM-DDTHH:mm:ssZ`). Use this for transport, logging, and APIs.

**Example:**

```ts
import { formatInstant } from '@vielzeug/tempo';

formatInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
// → '2026-03-21T10:15:30Z'
```

---

### `formatZoned(input, options?): string`

```ts
formatZoned(input: TimeInput, options?: TimeOptions): string;
```

Returns a full zoned ISO-8601 string including offset and timezone ID. Infers timezone from `ZonedDateTime` inputs; requires `options.tz` for all other input types.

**Example:**

```ts
import { formatZoned } from '@vielzeug/tempo';

formatZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });
// → '2026-03-21T11:15:30+01:00[Europe/Berlin]'

formatZoned(Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]'));
// → '2026-03-21T10:15:30+01:00[Europe/Berlin]'
```

---

### `formatRange(start, end, options?): string`

```ts
formatRange(start: TimeInput, end: TimeInput, options?: FormatOptions): string;
```

Formats a localized time span using `Intl.DateTimeFormat.formatRange`. Infers a shared timezone from `ZonedDateTime` inputs; throws if they are in different zones and `options.tz` is omitted.

**Example:**

```ts
import { formatRange } from '@vielzeug/tempo';

formatRange(
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
  { pattern: 'short', locale: 'en-US', tz: 'UTC' },
);
// → '3/21/2026, 10:00 – 12:00 AM'
```

---

### `formatRelative(input, options?): string`

```ts
formatRelative(input: RelativeTimeInput, options?: RelativeFormatOptions): string;
```

Returns a UX-friendly relative time string ("in 2 hours", "3 days ago") using `Intl.RelativeTimeFormat`. When `options.base` is omitted, the current instant is used.

**Parameters — `RelativeFormatOptions`:**

| Option    | Type                             | Default  | Description                                           |
| --------- | -------------------------------- | -------- | ----------------------------------------------------- |
| `base`    | `RelativeTimeInput`              | `now`    | Reference point for the relative calculation          |
| `locale`  | `Intl.LocalesArgument`           | system   | BCP 47 locale tag                                     |
| `numeric` | `Intl.RelativeTimeFormatNumeric` | `'auto'` | `'always'` forces "1 day ago"; `'auto'` uses "yesterday" |
| `style`   | `Intl.RelativeTimeFormatStyle`   | `'long'` | `'short'` or `'narrow'` for compact labels            |

**Example:**

```ts
import { formatRelative } from '@vielzeug/tempo';

const base = Temporal.Instant.from('2026-03-21T10:00:00Z');

formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), { base, locale: 'en-US', numeric: 'always' });
// → 'in 2 hours'

formatRelative(Temporal.Instant.from('2026-03-19T10:00:00Z'), { base, locale: 'en-US' });
// → '2 days ago'
```

## Duration Helpers

### `parseDuration(input): Temporal.Duration`

```ts
parseDuration(input: string | Temporal.DurationLike): Temporal.Duration;
```

Parses an ISO 8601 duration string or a `Temporal.DurationLike` object into a `Temporal.Duration`. Throws `TypeError` for invalid input.

**Example:**

```ts
import { parseDuration } from '@vielzeug/tempo';

parseDuration('PT2H30M');
parseDuration({ hours: 2, minutes: 30 });
parseDuration('-PT1H'); // negative duration
```

---

### `formatDuration(input, options?): string`

```ts
formatDuration(input: string | Temporal.DurationLike, options?: DurationFormatOptions): string;
```

Formats a duration for display. Uses `Intl.DurationFormat` when available; falls back to the ISO string representation.

**Parameters — `DurationFormatOptions`:**

| Option   | Type                                           | Default  | Description       |
| -------- | ---------------------------------------------- | -------- | ----------------- |
| `locale` | `Intl.LocalesArgument`                         | system   | BCP 47 locale tag |
| `style`  | `'digital' \| 'long' \| 'narrow' \| 'short'`  | `'long'` | Display style     |

**Example:**

```ts
import { formatDuration } from '@vielzeug/tempo';

formatDuration('PT2H30M', { locale: 'en-US', style: 'short' });
formatDuration({ hours: 1, minutes: 30 }, { locale: 'de-DE' });
```

## Expiry and Time-Difference Utilities

### `expires(date, days?, options?): ExpiryStatus`

```ts
expires(date: TimeInput, days?: number, options?: TimeOptions): ExpiryStatus;
```

Classifies `date` relative to now:

| Result      | Condition                              |
| ----------- | -------------------------------------- |
| `'NEVER'`   | Date is on or after year 9999          |
| `'EXPIRED'` | Date is in the past                    |
| `'SOON'`    | Date is within the next `days` days    |
| `'LATER'`   | Date is further in the future          |

`days` defaults to `7`. Plain inputs default to UTC; pass `options.tz` to override.

**Example:**

```ts
import { expires } from '@vielzeug/tempo';

expires(Temporal.Now.instant());                        // 'EXPIRED'
expires(Temporal.Instant.from('9999-12-31T00:00:00Z')); // 'NEVER'
expires(Temporal.Now.instant().add({ hours: 48 }));     // 'SOON'
expires(Temporal.Now.instant().add({ hours: 48 }), 1); // 'LATER' (window is 1 day only)
```

---

### `timeDiff(a, b?, options?): TimeDiffResult`

```ts
timeDiff(a: TimeInput, b?: TimeInput, options?: TimeOptions): TimeDiffResult;
```

Returns the absolute difference between `a` and `b` as `{ unit, value }` in the largest meaningful unit. When `b` is omitted, the current instant is used. Sub-second differences return `{ unit: 'millisecond', value: <ms> }`.

**Example:**

```ts
import { timeDiff } from '@vielzeug/tempo';

timeDiff(
  Temporal.Instant.from('2027-06-01T00:00:00Z'),
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
); // { unit: 'year', value: 1 }

timeDiff(Temporal.Now.instant().subtract({ hours: 2 })); // { unit: 'hour', value: 2 }
```

---

### `dateRange(start, end, step, options): Temporal.ZonedDateTime[]`

```ts
dateRange(
  start: TimeInput,
  end: TimeInput,
  step: Temporal.DurationLike,
  options: TimeOptionsWithTz,
): Temporal.ZonedDateTime[];
```

Generates an inclusive array of `ZonedDateTime` values advancing by `step`. Returns an empty array when `start > end`. Throws `RangeError` if `step` does not advance the date forward.

**Example:**

```ts
import { dateRange } from '@vielzeug/tempo';

dateRange(
  Temporal.ZonedDateTime.from('2026-03-01T00:00:00[UTC]'),
  Temporal.ZonedDateTime.from('2026-03-05T00:00:00[UTC]'),
  { days: 1 },
  { tz: 'UTC' },
);
// [Mar 1, Mar 2, Mar 3, Mar 4, Mar 5]
```

## Cache Management

### `clearCaches(): void`

```ts
clearCaches(): void;
```

Releases the internal `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, and `Intl.DurationFormat` caches. Call this in tests that need formatter isolation, or in long-running processes where locale data may have changed.

**Example:**

```ts
import { clearCaches } from '@vielzeug/tempo';

clearCaches();
```

## Types

```ts
type TimeInput =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;

type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

type BoundaryUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ExpiryStatus = 'EXPIRED' | 'LATER' | 'NEVER' | 'SOON';

type TimeDiffUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

type TimeDiffResult = { unit: TimeDiffUnit; value: number };

interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

type TimeOptionsWithTz = TimeOptions & { tz: string };

interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

/** `intl` and `pattern` are mutually exclusive — when `intl` is provided it takes full precedence. */
interface FormatOptions {
  intl?: Intl.DateTimeFormatOptions;
  locale?: Intl.LocalesArgument;
  pattern?: FormatPattern;
  tz?: string;
}

interface RelativeFormatOptions {
  base?: RelativeTimeInput;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}

interface BoundaryOptions extends TimeOptions {
  weekStartsOn?: WeekStartDay;
}

interface CompareOptions extends TimeOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}

type IsSameOptions = CompareOptions;

interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}
```
