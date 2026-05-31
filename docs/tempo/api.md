---
title: Tempo — API Reference
description: Complete API reference for @vielzeug/tempo date/time functions.
---

[[toc]]

## API At a Glance

| Symbol                                    | Purpose                                              | Common gotcha                                                 |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `now(tz)`                                 | Current zoned date/time                              | Requires a valid IANA timezone string                         |
| `parseLocal(input)`                       | Parse a wall-clock string to `PlainDateTime`         | No timezone attached — use `toInstant()` to pin it            |
| `parseInstant(input)`                     | Parse a UTC ISO string to `Instant`                  | Input must end in `Z` or include an offset                    |
| `parseAny(input)`                         | Parse any ISO 8601 string to the most specific type  | Tries ZonedDateTime → Instant → PlainDateTime → PlainDate     |
| `isValid(value)`                          | Type guard for any `TimeInput`                       | Returns `false` for strings, numbers, and `null`              |
| `toInstant(input, options?)`              | Normalize any input to a UTC instant                 | Plain inputs require `options.tz`                             |
| `toZoned(input, options)`                 | Project a time into a specific timezone              | `options.tz` is required                                      |
| `shift(input, duration, options?)`        | DST-safe add/subtract                                | `options.tz` required for plain/instant inputs                |
| `difference(start, end, options?)`        | Duration between two values                          | Requires `tz` only for calendar units or plain inputs         |
| `within(value, start, end, options?)`     | Inclusive range check                                | Bounds auto-normalized; use `unit` for calendar checks        |
| `clamp(value, start, end, options?)`      | Clamp to range; returns `Temporal.Instant`           | With `unit`, returns unit-aligned instant, not original value |
| `isBefore(a, b, options?)`                | Returns `true` when `a` is earlier than `b`          | Omit `unit` for raw timeline comparison                       |
| `isAfter(a, b, options?)`                 | Returns `true` when `a` is later than `b`            | Omit `unit` for raw timeline comparison                       |
| `isSame(a, b, options?)`                  | Returns `true` when `a` and `b` are equal            | Set `unit` for calendar-unit equality                         |
| `startOf(input, unit, options?)`          | Snap to start of a calendar unit                     | Week boundaries depend on `weekStartsOn` (default Monday)     |
| `endOf(input, unit, options?)`            | Snap to end of a calendar unit                       | Returns 1 nanosecond before the next unit starts              |
| `format(input, options?)`                 | Localized display formatting with presets            | `intl` and `pattern` are mutually exclusive                   |
| `formatParts(input, options?)`            | Raw `Intl.DateTimeFormatPart[]` for custom rendering | Same options as `format()`                                    |
| `formatInstant(input, options?)`          | UTC ISO-8601 instant string                          | Always UTC regardless of input zone                           |
| `formatZoned(input, options?)`            | Zoned ISO-8601 string                                | `options.tz` required for non-zoned inputs                    |
| `formatRange(start, end, options?)`       | Localized time-span string                           | Throws when zoned inputs are in different zones without `tz`  |
| `formatRangeParts(start, end, options?)`  | Raw `Intl.DateTimeRangeFormatPart[]` array           | Same zone-mismatch rules as `formatRange()`                   |
| `formatRelative(input, options?)`         | UX relative text ("in 2 hours", "3 days ago")        | Input restricted to `Instant` or `ZonedDateTime`              |
| `parseDuration(input)`                    | Parse ISO 8601 duration or `DurationLike` object     | Throws `TypeError` for invalid strings                        |
| `formatDuration(input, options?)`         | Format a duration for display                        | Falls back to plain English if `Intl.DurationFormat` absent   |
| `expires(date, thresholds, options?)`     | Classify a date against named threshold buckets      | Returns `null` when no threshold matches                      |
| `classify(date, thresholds, options?)`    | `expires` + `timeDiff` in one call                   | Returns `{ key, diff }` — `key` is `null` when no match      |
| `timeDiff(a, b?, options?)`               | Largest-unit difference as `{ unit, value }`         | No `tz` needed when both inputs are `Instant`                 |
| `humanize(diff)`                          | `TimeDiffResult` → human-readable string             | Singular/plural handled automatically                         |
| `dateRange(start, end, step, options)`    | Lazy generator of `ZonedDateTime` values             | `step` must advance time forward; `options.tz` required       |
| `recurrence(start, rule, options)`        | Lazy generator for repeating dates                   | `count` or `until` required (enforced at compile time)        |

## Package Entry Point

```ts
import {
  Temporal,
  classify,
  clamp,
  dateRange,
  difference,
  endOf,
  expires,
  format,
  formatDuration,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatZoned,
  humanize,
  isAfter,
  isBefore,
  isSame,
  isValid,
  now,
  parseAny,
  parseDuration,
  parseInstant,
  parseLocal,
  recurrence,
  shift,
  startOf,
  timeDiff,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/tempo';
```

`Temporal` is re-exported directly — consumers never need to import `@js-temporal/polyfill` themselves.

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

parseLocal('2026-03-21');             // 2026-03-21T00:00:00
parseLocal('2026-03-21T10:15:30');   // 2026-03-21T10:15:30
```

---

### `parseInstant(input): Temporal.Instant`

```ts
parseInstant(input: string): Temporal.Instant;
```

Parses a UTC ISO 8601 string into a `Temporal.Instant`. The input must include an offset or end in `Z`. Throws a descriptive `TypeError` on invalid input.

**Example:**

```ts
import { parseInstant } from '@vielzeug/tempo';

parseInstant('2026-03-21T10:15:30Z');
parseInstant('2026-03-21T11:15:30+01:00');
```

---

### `parseAny(input): TimeInput`

```ts
parseAny(input: string): TimeInput;
```

Parses any ISO 8601 string into the most specific `TimeInput` type, trying in order: `ZonedDateTime` → `Instant` → `PlainDateTime` → `PlainDate`. Throws a descriptive `TypeError` if none match.

**Example:**

```ts
import { parseAny } from '@vielzeug/tempo';

parseAny('2026-03-21T11:00:00+01:00[Europe/Berlin]'); // ZonedDateTime
parseAny('2026-03-21T10:00:00Z');                     // Instant
parseAny('2026-03-21T10:00:00');                      // PlainDateTime
parseAny('2026-03-21');                               // PlainDate
```

---

### `isValid(value): value is TimeInput`

```ts
isValid(value: unknown): value is TimeInput;
```

Type guard that returns `true` when `value` is a valid `Temporal.Instant`, `ZonedDateTime`, `PlainDateTime`, or `PlainDate`.

**Example:**

```ts
import { isValid } from '@vielzeug/tempo';

isValid(Temporal.Instant.from('2026-03-21T10:00:00Z')); // true
isValid('2026-03-21');                                   // false
isValid(null);                                           // false
```

---

### `toInstant(input, options?): Temporal.Instant`

```ts
toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
```

Normalizes any `TimeInput` to an absolute `Temporal.Instant`.

**Parameters — `TimeOptions`:**

| Option   | Type                     | Default        | Description                                        |
| -------- | ------------------------ | -------------- | -------------------------------------------------- |
| `tz`     | `string`                 | —              | Required when input is `PlainDate`/`PlainDateTime` |
| `prefer` | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation for ambiguous local times       |

**Example:**

```ts
import { parseLocal, toInstant } from '@vielzeug/tempo';

toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
toInstant(parseLocal('2026-03-21T10:15:30'), { tz: 'America/New_York' });
// DST fall-back: pick the earlier occurrence of the ambiguous hour
toInstant(parseLocal('2026-11-01T01:30:00'), { tz: 'America/New_York', prefer: 'earlier' });
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
// → 2026-03-21T11:15:30+01:00[Europe/Berlin]
```

---

### `shift(input, duration, options?): Temporal.ZonedDateTime`

```ts
shift(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
```

Adds `duration` to `input` using DST-aware calendar arithmetic. Negative values subtract.

**Parameters — `TimeOptions`:**

| Option   | Type                     | Default        | Description                                           |
| -------- | ------------------------ | -------------- | ----------------------------------------------------- |
| `tz`     | `string`                 | —              | Required for plain/instant inputs; inferred for zoned |
| `prefer` | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation                                    |

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
| `prefer`            | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation                                 |

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

// DST-correct day count across spring-forward
difference(
  Temporal.ZonedDateTime.from('2026-03-08T00:00:00-05:00[America/New_York]'),
  Temporal.ZonedDateTime.from('2026-03-09T00:00:00-04:00[America/New_York]'),
  { largestUnit: 'hour' },
).hours; // 23 (one hour shorter due to DST)
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

Formats `input` for display using `Intl.DateTimeFormat`. Use `pattern` for common presets or `intl` for a custom `Intl.DateTimeFormatOptions` object. `intl` and `pattern` are **mutually exclusive** — enforced at the type level.

**Parameters — `FormatOptions` (discriminated union):**

| Variant          | Option    | Type                         | Default       | Description                                              |
| ---------------- | --------- | ---------------------------- | ------------- | -------------------------------------------------------- |
| `pattern` branch | `pattern` | `FormatPattern`              | `'medium'`    | Preset shorthand                                         |
| `intl` branch    | `intl`    | `Intl.DateTimeFormatOptions` | —             | Full `Intl` spec; mutually exclusive with `pattern`      |
| Both variants    | `locale`  | `Intl.LocalesArgument`       | system locale | BCP 47 locale tag                                        |
| Both variants    | `tz`      | `string`                     | —             | Inferred from `ZonedDateTime` inputs; required otherwise |

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

### `formatParts(input, options?): Intl.DateTimeFormatPart[]`

```ts
formatParts(input: TimeInput, options?: FormatOptions): Intl.DateTimeFormatPart[];
```

Returns the raw `Intl.DateTimeFormatPart[]` array for `input`, enabling custom rendering where individual parts (year, month, day, etc.) need to be styled or composed differently. Accepts the same options as `format()`.

**Example:**

```ts
import { formatParts } from '@vielzeug/tempo';

const parts = formatParts(Temporal.Instant.from('2026-03-21T10:15:30Z'), { pattern: 'date-only', tz: 'UTC' });
// [{ type: 'month', value: '3' }, { type: 'literal', value: '/' }, ...]
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

### `formatRangeParts(start, end, options?): Intl.DateTimeRangeFormatPart[]`

```ts
formatRangeParts(
  start: TimeInput,
  end: TimeInput,
  options?: FormatOptions,
): ReturnType<Intl.DateTimeFormat['formatRangeToParts']>;
```

Returns the raw `Intl.DateTimeRangeFormatPart[]` array for a time span, enabling fine-grained rendering of range start, end, and shared parts separately. Applies the same timezone-inference and mismatch-detection rules as `formatRange()`.

**Example:**

```ts
import { formatRangeParts } from '@vielzeug/tempo';

const parts = formatRangeParts(
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
  { pattern: 'short', locale: 'en-US', tz: 'UTC' },
);
// [{ type: 'month', value: '3', source: 'shared' }, ...]

// Render only the start part
const startParts = parts.filter(p => p.source === 'startRange' || p.source === 'shared');
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

Formats a duration for display. Uses `Intl.DurationFormat` when available; falls back to a plain English representation ("2 hours, 30 minutes").

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

## Expiry and Classification

### `expires(date, thresholds, options?, now?): K | null`

```ts
expires<K extends string>(
  date: TimeInput,
  thresholds: Record<K, Temporal.DurationLike>,
  options?: TimeOptions,
  now?: Temporal.Instant,
): K | null;
```

Classifies `date` into a named bucket by computing `diff = date − now` and returning the key of the first threshold where `diff ≤ threshold`. Thresholds are sorted ascending before comparison.

- Negative threshold values classify **past** dates (e.g., `{ days: -30 }` matches dates more than 30 days ago).
- Returns `null` when no threshold matches.
- Requires `options.tz` when input is `PlainDate` or `PlainDateTime`.
- Pass `now` to fix the reference point (useful in tests).

**Example:**

```ts
import { expires } from '@vielzeug/tempo';

const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days past
  expired:     { days: 0 },   // any past date
  critical:    { days: 3 },   // within 3 days
  warning:     { days: 14 },  // within 14 days
  safe:        { years: 100 }, // catch-all far future
} as const;

expires(Temporal.Now.instant().subtract({ days: 60 }), THRESHOLDS); // 'longExpired'
expires(Temporal.Now.instant().subtract({ hours: 6 }), THRESHOLDS); // 'expired'
expires(Temporal.Now.instant().add({ hours: 48 }), THRESHOLDS);     // 'critical'
expires(Temporal.Now.instant().add({ days: 10 }), THRESHOLDS);      // 'warning'
expires(Temporal.Now.instant().add({ years: 1 }), THRESHOLDS);      // 'safe'

// No threshold matches — returns null
expires(Temporal.Now.instant().add({ years: 200 }), { soon: { days: 3 } }); // null
```

---

### `classify(date, thresholds, options?): { key: K | null; diff: TimeDiffResult }`

```ts
classify<K extends string>(
  date: TimeInput,
  thresholds: Record<K, Temporal.DurationLike>,
  options?: TimeOptions,
): { diff: TimeDiffResult; key: K | null };
```

Combines `expires()` and `timeDiff()` in a single call, sharing the same `now` reference. Returns both the matching threshold key and the structured time difference.

**Example:**

```ts
import { classify } from '@vielzeug/tempo';

const { key, diff } = classify(expiresAt, {
  expired:  { days: 0 },
  critical: { days: 3 },
  warning:  { days: 14 },
  safe:     { years: 100 },
});

// key: 'critical' | 'expired' | 'warning' | 'safe' | null
// diff: { unit: 'hour' | 'day' | ..., value: number }
```

---

### `timeDiff(a, b?, options?): TimeDiffResult`

```ts
timeDiff(a: TimeInput, b?: TimeInput, options?: TimeOptions): TimeDiffResult;
```

Returns the absolute difference between `a` and `b` as `{ unit, value }` in the largest meaningful unit. When `b` is omitted, the current instant is used.

**Timezone requirement:**
- When both inputs are `Temporal.Instant`: no `tz` needed — uses millisecond arithmetic (1 day = 86 400 s).
- When either input is `PlainDate`, `PlainDateTime`, or `ZonedDateTime`: `tz` is required (inferred from `ZonedDateTime` inputs).

Sub-second differences return `{ unit: 'millisecond', value: <ms> }`. Zero difference returns `{ unit: 'millisecond', value: 0 }`.

**Example:**

```ts
import { timeDiff } from '@vielzeug/tempo';

// No tz needed for two Instants
timeDiff(
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
  Temporal.Instant.from('2027-06-01T00:00:00Z'),
); // { unit: 'year', value: 1 }

// b defaults to now
timeDiff(Temporal.Now.instant().subtract({ hours: 3 })); // { unit: 'hour', value: 3 }

// Calendar-accurate with tz
timeDiff(
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
  Temporal.ZonedDateTime.from('2026-06-15T00:00:00[UTC]'),
  { tz: 'UTC' },
); // { unit: 'month', value: 5 }
```

---

### `humanize(diff): string`

```ts
humanize(diff: TimeDiffResult): string;
```

Converts a `TimeDiffResult` to a human-readable English string. Uses the singular form when `value === 1`, plural otherwise.

**Example:**

```ts
import { humanize, timeDiff } from '@vielzeug/tempo';

humanize({ unit: 'day', value: 1 });          // '1 day'
humanize({ unit: 'hour', value: 7 });         // '7 hours'
humanize({ unit: 'millisecond', value: 0 });  // '0 milliseconds'

// Typical combined usage
humanize(timeDiff(publishedAt)); // '3 days'
```

## Range and Recurrence

### `dateRange(start, end, step, options): Generator<Temporal.ZonedDateTime>`

```ts
dateRange(
  start: TimeInput,
  end: TimeInput,
  step: Temporal.DurationLike,
  options: TimeOptionsWithTz,
): Generator<Temporal.ZonedDateTime>;
```

Lazily generates `ZonedDateTime` values between `start` and `end` (inclusive), advancing by `step`. Returns a generator — use `for...of` for lazy consumption or spread (`[...dateRange(...)]`) to collect into an array. Returns nothing when `start > end`. Throws `RangeError` if `step` does not advance the date forward.

**Example:**

```ts
import { dateRange } from '@vielzeug/tempo';

const start = Temporal.ZonedDateTime.from('2026-03-01T00:00:00[UTC]');
const end   = Temporal.ZonedDateTime.from('2026-03-31T00:00:00[UTC]');

// Lazy — safe for large ranges
for (const day of dateRange(start, end, { days: 1 }, { tz: 'UTC' })) {
  render(day);
  if (someCondition) break; // safe to break early
}

// Collect to array
const days = [...dateRange(start, end, { days: 1 }, { tz: 'UTC' })];
// [Mar 1, Mar 2, ..., Mar 31]
```

---

### `recurrence(start, rule, options): Generator<Temporal.ZonedDateTime>`

```ts
recurrence(
  start: TimeInput,
  rule: RecurrenceRule,
  options: TimeOptionsWithTz,
): Generator<Temporal.ZonedDateTime>;
```

Lazily generates `ZonedDateTime` occurrences according to a recurrence rule. Supports `daily`, `weekly`, `monthly`, and `yearly` frequencies.

Either `count` or `until` (or both) **must** be provided — this is enforced at compile time by the `RecurrenceRule` type and validated eagerly at call time for JavaScript callers.

**Parameters — `RecurrenceRule`:**

| Field       | Type                                            | Required         | Description                           |
| ----------- | ----------------------------------------------- | ---------------- | ------------------------------------- |
| `frequency` | `'daily' \| 'weekly' \| 'monthly' \| 'yearly'` | ✅               | Recurrence frequency                  |
| `interval`  | `number`                                        | —                | Step multiplier (default `1`)         |
| `count`     | `number`                                        | One of these two | Maximum number of occurrences to emit |
| `until`     | `TimeInput`                                     | One of these two | Inclusive end boundary                |

**Example:**

```ts
import { recurrence } from '@vielzeug/tempo';

const start = Temporal.ZonedDateTime.from('2026-01-05T09:00:00[Europe/Berlin]');

// Every Monday for 4 weeks
const mondays = [...recurrence(start, { frequency: 'weekly', count: 4 }, { tz: 'Europe/Berlin' })];

// Bi-weekly meetings until a deadline
const deadline = Temporal.ZonedDateTime.from('2026-06-30T00:00:00[Europe/Berlin]');
for (const meeting of recurrence(start, { frequency: 'weekly', interval: 2, until: deadline }, { tz: 'Europe/Berlin' })) {
  schedule(meeting);
}

// Every 3 months, 6 times
const quarters = [...recurrence(start, { frequency: 'monthly', interval: 3, count: 6 }, { tz: 'UTC' })];
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

type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';

// Discriminated union — intl and pattern are mutually exclusive
type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; tz?: string }
  | { locale?: Intl.LocalesArgument; pattern?: FormatPattern; tz?: string };

type BoundaryUnit = 'day' | 'hour' | 'minute' | 'month' | 'week' | 'year';

type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type TimeDiffUnit = 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'second' | 'week' | 'year';

type TimeDiffResult = { unit: TimeDiffUnit; value: number };

// Either count or until (or both) must be provided
type RecurrenceRule = {
  frequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
  interval?: number;
} & ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });

interface TimeOptions {
  prefer?: DateTimeDisambiguation;
  tz?: string;
}

type TimeOptionsWithTz = TimeOptions & { tz: string };

interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
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

interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}
```
