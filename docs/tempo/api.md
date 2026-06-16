---
title: Tempo — API Reference
description: Complete API reference for @vielzeug/tempo date/time functions.
---

[[toc]]

## API At a Glance

| Symbol                                   | Purpose                                              | Common gotcha                                                                             |
| ---------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `now(tz)`                                | Current zoned date/time                              | Requires a valid IANA timezone string                                                     |
| `nowInstant()`                           | Current UTC instant                                  | Use instead of `Temporal.Now.instant()`                                                   |
| `parse(input, as?)`                      | Parse any ISO 8601 string; `as` pins the return type | Without `as`, auto-detects: ZonedDateTime → Instant → PlainDateTime → PlainDate           |
| `parseInstant(input)`                    | Parse a UTC ISO string to `Instant`                  | Input must end in `Z` or include an offset                                                |
| `parseZoned(input)`                      | Parse a zoned ISO string to `ZonedDateTime`          | Must include offset and timezone (`[Region/City]`)                                        |
| `parsePlainDateTime(input)`              | Parse a wall-clock string to `PlainDateTime`         | No timezone attached — use `toInstant()` to pin it                                        |
| `parsePlainDate(input)`                  | Parse a date-only string to `PlainDate`              | Use instead of `Temporal.PlainDate.from()`                                                |
| `isValid(value)`                         | Type guard for any `TimeInput`                       | Returns `false` for strings, numbers, and `null`                                          |
| `toInstant(input, options?)`             | Normalize any input to a UTC instant                 | Plain inputs require `options.tz`                                                         |
| `inTz(input, tz)`                        | Project any input into a specific timezone           | Returns `ZonedDateTime`; re-projects `ZonedDateTime` inputs (wall-clock changes)          |
| `shift(input, duration, options?)`       | DST-safe add/subtract                                | `options.tz` required for plain/instant inputs                                            |
| `difference(start, end, options?)`       | Duration between two values                          | Requires `tz` only for calendar units or plain inputs                                     |
| `within(value, start, end, options?)`    | Inclusive range check                                | Bounds auto-normalized; use `unit` for calendar checks                                    |
| `clamp(value, start, end, options?)`     | Clamp to range; returns `Temporal.Instant`           | With `unit`, returns the **floor** of the boundary unit of `value`, not `value` itself    |
| `isBefore(a, b, options?)`               | Returns `true` when `a` is earlier than `b`          | Omit `unit` for raw timeline comparison                                                   |
| `isAfter(a, b, options?)`                | Returns `true` when `a` is later than `b`            | Omit `unit` for raw timeline comparison                                                   |
| `isSame(a, b, options?)`                 | Returns `true` when `a` and `b` are equal            | Set `unit` for calendar-unit equality                                                     |
| `startOf(input, unit, options?)`         | Snap to start of a calendar unit                     | Week boundaries depend on `weekStartsOn` (default Monday)                                 |
| `endOf(input, unit, options?)`           | Snap to end of a calendar unit                       | Returns 1 nanosecond before the next unit starts                                          |
| `format(input, options?)`                | Localized display formatting with presets            | `intl` and `pattern` are mutually exclusive                                               |
| `formatParts(input, options?)`           | Raw `Intl.DateTimeFormatPart[]` for custom rendering | Same options as `format()`                                                                |
| `formatInstant(input, options?)`         | UTC ISO-8601 instant string                          | Always UTC regardless of input zone                                                       |
| `formatZoned(input, options?)`           | Zoned ISO-8601 string                                | `options.tz` required for non-zoned inputs                                                |
| `formatRange(start, end, options?)`      | Localized time-span string                           | Throws when zoned inputs are in different zones without `tz`                              |
| `formatRangeParts(start, end, options?)` | Raw `Intl.DateTimeRangeFormatPart[]` array           | Same zone-mismatch rules as `formatRange()`                                               |
| `formatRelative(input, options?)`        | UX relative text ("in 2 hours", "3 days ago")        | Input restricted to `Instant` or `ZonedDateTime`                                          |
| `parseDuration(input)`                   | Parse ISO 8601 duration or `DurationLike` object     | Throws `TypeError` for invalid strings                                                    |
| `formatDuration(input, options?)`        | Format a duration for display                        | Falls back to plain English if `Intl.DurationFormat` absent                               |
| `expires(date, thresholds, options?)`    | Classify a date against named threshold buckets      | Returns `null` when no threshold matches; define thresholds at module scope for best perf |
| `timeDiff(a, b?, options?)`              | Largest-unit difference as `{ unit, value }`         | No `tz` needed when both inputs are `Instant`                                             |
| `humanize(diff, options?)`               | `TimeDiffResult` → human-readable string             | English-only; use `formatRelative()` for localized output                                 |
| `dateRange(start, end, step, options?)`  | Lazy generator of `ZonedDateTime` values             | `step` must advance time forward; `tz` inferred from `ZonedDateTime`, required otherwise  |
| `recurrence(start, rule, options?)`      | Lazy generator for repeating dates                   | `count` or `until` required; `tz` inferred from `ZonedDateTime` start                     |

## Package Entry Point

```ts
import {
  Temporal,
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
  inTz,
  isAfter,
  isBefore,
  isSame,
  isValid,
  now,
  nowInstant,
  parse,
  parseDuration,
  parseInstant,
  parsePlainDateTime,
  parsePlainDate,
  parseZoned,
  recurrence,
  shift,
  startOf,
  timeDiff,
  toInstant,
  within,
} from '@vielzeug/tempo';
```

`Temporal` is re-exported directly — consumers never need to import `@js-temporal/polyfill` themselves. Use `parse(input, as?)` for flexible input detection, or the specific helpers (`parseInstant`, `parseZoned`, `parsePlainDateTime`, `parsePlainDate`) when the input format is known.

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

### `nowInstant(): Temporal.Instant`

```ts
nowInstant(): Temporal.Instant;
```

Returns the current absolute instant (UTC point in time). Use this instead of `Temporal.Now.instant()` so your code only imports from `@vielzeug/tempo`.

**Example:**

```ts
import { expires, nowInstant, timeDiff } from '@vielzeug/tempo';

// Snapshot the current instant
const t = nowInstant();

timeDiff(t); // { unit: 'millisecond', value: 0 }
expires(t, { expired: { days: 0 }, safe: { years: 100 } }); // 'safe'
```

---

### `parseZoned(input): Temporal.ZonedDateTime`

```ts
parseZoned(input: string): Temporal.ZonedDateTime;
```

Parses a full ISO 8601 zoned date-time string (must include both offset and `[Region/City]` identifier) into a `ZonedDateTime`. Throws a descriptive `[tempo]` error on invalid input. Use instead of `Temporal.ZonedDateTime.from()`.

**Example:**

```ts
import { parseZoned } from '@vielzeug/tempo';

parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]');
parseZoned('2026-03-21T00:00:00[UTC]');
```

---

### `parsePlainDate(input): Temporal.PlainDate`

```ts
parsePlainDate(input: string): Temporal.PlainDate;
```

Parses an ISO 8601 date-only string into a timezone-free `PlainDate`. Use this instead of `Temporal.PlainDate.from()`. Pair with `inTz()` or `toInstant()` when a timezone is needed.

**Example:**

```ts
import { inTz, parsePlainDate } from '@vielzeug/tempo';

parsePlainDate('2026-03-21'); // 2026-03-21

// Attach a timezone when needed
inTz(parsePlainDate('2026-03-21'), 'America/New_York');
```

---

### `parsePlainDateTime(input): Temporal.PlainDateTime`

```ts
parsePlainDateTime(input: string): Temporal.PlainDateTime;
```

Parses an ISO 8601 date or date-time string into a timezone-free `PlainDateTime`. Use this at the boundary where user input or database values arrive as wall-clock strings.

**Example:**

```ts
import { parsePlainDateTime } from '@vielzeug/tempo';

parsePlainDateTime('2026-03-21'); // 2026-03-21T00:00:00
parsePlainDateTime('2026-03-21T10:15:30'); // 2026-03-21T10:15:30
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

### `parse(input, as?): TimeInput`

```ts
parse(input: string, as: 'zoned'): Temporal.ZonedDateTime;
parse(input: string, as: 'instant'): Temporal.Instant;
parse(input: string, as: 'plain-datetime'): Temporal.PlainDateTime;
parse(input: string, as: 'plain-date'): Temporal.PlainDate;
parse(input: string, as?: ParseAs): TimeInput;
```

Parses any ISO 8601 string. Without `as`, auto-detects the most specific type in order: `ZonedDateTime` → `Instant` → `PlainDateTime` → `PlainDate`. With `as`, the return type is narrowed at compile time. Throws a descriptive `[tempo]` error if parsing fails.

The `as` parameter accepts a `ParseAs` value: `'zoned' | 'instant' | 'plain-datetime' | 'plain-date'`.

**Example:**

```ts
import { parse } from '@vielzeug/tempo';

// Auto-detect
parse('2026-03-21T11:00:00+01:00[Europe/Berlin]'); // Temporal.ZonedDateTime
parse('2026-03-21T10:00:00Z'); // Temporal.Instant
parse('2026-03-21T10:00:00'); // Temporal.PlainDateTime
parse('2026-03-21'); // Temporal.PlainDate

// Typed overloads — return type is narrowed
parse('2026-03-21T10:00:00Z', 'instant'); // Temporal.Instant
parse('2026-03-21', 'plain-date'); // Temporal.PlainDate
```

---

### `isValid(value): value is TimeInput`

```ts
isValid(value: unknown): value is TimeInput;
```

Type guard that returns `true` when `value` is a valid `Temporal.Instant`, `ZonedDateTime`, `PlainDateTime`, or `PlainDate`.

**Example:**

```ts
import { isValid, parseInstant } from '@vielzeug/tempo';

isValid(parseInstant('2026-03-21T10:00:00Z')); // true
isValid('2026-03-21'); // false
isValid(null); // false
```

---

### `toInstant(input, options?): Temporal.Instant`

```ts
toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
```

Normalizes any `TimeInput` to an absolute `Temporal.Instant`.

**Parameters — `TimeOptions`:**

| Option | Type     | Description                                        |
| ------ | -------- | -------------------------------------------------- |
| `tz`   | `string` | Required when input is `PlainDate`/`PlainDateTime` |

**Example:**

```ts
import { parseInstant, parsePlainDateTime, toInstant } from '@vielzeug/tempo';

toInstant(parseInstant('2026-03-21T10:15:30Z'));
toInstant(parsePlainDateTime('2026-03-21T10:15:30'), { tz: 'America/New_York' });
```

---

### `inTz(input, tz): Temporal.ZonedDateTime`

```ts
inTz(input: TimeInput, tz: string): Temporal.ZonedDateTime;
```

Projects any `TimeInput` into `tz`. When `input` is already a `ZonedDateTime`, it is **re-projected** via `withTimeZone()` — the absolute instant is preserved but the wall-clock time changes.

**Example:**

```ts
import { inTz, parseInstant, parseZoned } from '@vielzeug/tempo';

inTz(parseInstant('2026-03-21T10:15:30Z'), 'Europe/Berlin');
// → 2026-03-21T11:15:30+01:00[Europe/Berlin]

// ZonedDateTime re-projected — same instant, different wall clock
inTz(parseZoned('2026-03-21T11:15:30+01:00[Europe/Berlin]'), 'UTC');
// → 2026-03-21T10:15:30+00:00[UTC]
```

---

### `shift(input, duration, options?): Temporal.ZonedDateTime`

```ts
// ZonedDateTime input — tz inferred, options optional
shift(input: Temporal.ZonedDateTime, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;

// Instant / PlainDate / PlainDateTime — tz required
shift(input: Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime, duration: Temporal.DurationLike, options: ShiftOptions & { tz: string }): Temporal.ZonedDateTime;
```

Adds `duration` to `input` using DST-aware calendar arithmetic. Negative values subtract. **Always returns `Temporal.ZonedDateTime`** — call `.toInstant()` if you need an `Instant` back.

**Parameters — `ShiftOptions` (extends `TimeOptions`):**

| Option   | Type                     | Default        | Description                                           |
| -------- | ------------------------ | -------------- | ----------------------------------------------------- |
| `tz`     | `string`                 | —              | Required for plain/instant inputs; inferred for zoned |
| `prefer` | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation for `PlainDateTime` inputs         |

**Example:**

```ts
import { parseInstant, parseZoned, shift } from '@vielzeug/tempo';

// Zoned input — timezone inferred
shift(parseZoned('2026-03-08T01:30:00-05:00[America/New_York]'), { hours: 1 });
// → 2026-03-08T03:30:00-04:00[America/New_York]  (DST spring-forward handled)

// Instant input — timezone required
shift(parseInstant('2026-03-21T10:00:00Z'), { days: 1 }, { tz: 'UTC' });
```

---

### `difference(start, end, options?): Temporal.Duration`

```ts
difference(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;
```

Returns the signed duration from `start` to `end`. When `start > end` the result is negative.

**Parameters — `DifferenceOptions`:**

| Option              | Type                     | Default        | Description                                 |
| ------------------- | ------------------------ | -------------- | ------------------------------------------- |
| `tz`                | `string`                 | —              | Required for plain inputs or calendar units |
| `largestUnit`       | `Temporal.DateTimeUnit`  | `'second'`     | Largest unit in the returned duration       |
| `smallestUnit`      | `Temporal.DateTimeUnit`  | `'second'`     | Smallest unit; excess is rounded            |
| `roundingMode`      | `Temporal.RoundingMode`  | `'trunc'`      | Rounding direction for `smallestUnit`       |
| `roundingIncrement` | `number`                 | `1`            | Rounding granularity for `smallestUnit`     |
| `prefer`            | `DateTimeDisambiguation` | `'compatible'` | DST disambiguation                          |

Two `Temporal.Instant` inputs with sub-day `largestUnit`/`smallestUnit` do not need `tz`. Calendar units (`day`, `week`, `month`, `year`) always require `tz`.

**Example:**

```ts
import { difference, parseInstant, parseZoned } from '@vielzeug/tempo';

// Instant-to-instant, sub-day units — no tz needed
difference(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:30:00Z'), {
  largestUnit: 'hour',
  smallestUnit: 'minute',
}); // PT2H30M

// DST-correct day count across spring-forward
difference(
  parseZoned('2026-03-08T00:00:00-05:00[America/New_York]'),
  parseZoned('2026-03-09T00:00:00-04:00[America/New_York]'),
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
import { parseInstant, within } from '@vielzeug/tempo';

const lo = parseInstant('2026-03-21T10:00:00Z');
const hi = parseInstant('2026-03-21T12:00:00Z');

within(parseInstant('2026-03-21T11:00:00Z'), lo, hi); // true
within(lo, lo, hi); // true (inclusive)
within(parseInstant('2026-03-22T05:00:00Z'), lo, hi, { unit: 'day', tz: 'UTC' }); // true
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
import { clamp, parseInstant } from '@vielzeug/tempo';

const lo = parseInstant('2026-03-21T10:00:00Z');
const hi = parseInstant('2026-03-21T12:00:00Z');

clamp(parseInstant('2026-03-21T13:00:00Z'), lo, hi).toString(); // '2026-03-21T12:00:00Z'
clamp(parseInstant('2026-03-23T05:00:00Z'), lo, hi, { unit: 'day', tz: 'America/New_York' });
```

---

### `isBefore(a, b, options?): boolean`

```ts
isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` is earlier than `b` on the timeline. Set `options.unit` for calendar-unit comparison.

**Example:**

```ts
import { isBefore, parseInstant } from '@vielzeug/tempo';

isBefore(parseInstant('2026-03-21T23:30:00Z'), parseInstant('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'UTC',
}); // true — different UTC days
```

---

### `isAfter(a, b, options?): boolean`

```ts
isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` is later than `b` on the timeline. Set `options.unit` for calendar-unit comparison.

**Example:**

```ts
import { isAfter, parseInstant } from '@vielzeug/tempo';

isAfter(parseInstant('2026-03-21T12:00:00Z'), parseInstant('2026-03-21T10:00:00Z')); // true
```

---

### `isSame(a, b, options?): boolean`

```ts
isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Returns `true` when `a` and `b` represent the same point or the same calendar unit. Infers timezone from `ZonedDateTime` inputs; throws when both are zoned in different zones and `options.tz` is omitted.

**Example:**

```ts
import { isSame, parseInstant } from '@vielzeug/tempo';

isSame(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T10:00:00Z')); // true

// Same calendar day in New York even though UTC dates differ
isSame(parseInstant('2026-03-21T23:30:00Z'), parseInstant('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'America/New_York',
}); // true
```

## Boundary Helpers

### `startOf(input, unit, options?): Temporal.ZonedDateTime`

```ts
startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
```

Snaps `input` to the start of `unit`. For `ZonedDateTime` inputs, `options.tz` is inferred automatically.

**Parameters — `BoundaryOptions`:**

| Option         | Type           | Default | Description                          |
| -------------- | -------------- | ------- | ------------------------------------ |
| `tz`           | `string`       | —       | Required for non-zoned inputs        |
| `weekStartsOn` | `WeekStartDay` | `1`     | ISO weekday (1 = Monday, 7 = Sunday) |

Supported units: `'minute'` · `'hour'` · `'day'` · `'week'` · `'month'` · `'year'`

**Example:**

```ts
import { parseInstant, startOf } from '@vielzeug/tempo';

startOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
// → 2026-03-21T00:00:00+00:00[UTC]

startOf(parseInstant('2026-03-25T12:00:00Z'), 'week', { tz: 'UTC', weekStartsOn: 1 });
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
import { endOf, parseInstant } from '@vielzeug/tempo';

endOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
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
import { format, parseInstant } from '@vielzeug/tempo';

format(parseInstant('2026-03-21T10:15:30Z'), { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
// → '21/03/2026, 10:15'

// Escape hatch: full Intl spec
format(parseInstant('2026-03-21T10:15:30Z'), {
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
import { formatParts, parseInstant } from '@vielzeug/tempo';

const parts = formatParts(parseInstant('2026-03-21T10:15:30Z'), { pattern: 'date-only', tz: 'UTC' });
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
import { formatInstant, parseInstant } from '@vielzeug/tempo';

formatInstant(parseInstant('2026-03-21T10:15:30Z'));
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
import { formatZoned, parseInstant, parseZoned } from '@vielzeug/tempo';

formatZoned(parseInstant('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });
// → '2026-03-21T11:15:30+01:00[Europe/Berlin]'

formatZoned(parseZoned('2026-03-21T10:15:30+01:00[Europe/Berlin]'));
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
import { formatRange, parseInstant } from '@vielzeug/tempo';

formatRange(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'UTC',
});
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
import { formatRangeParts, parseInstant } from '@vielzeug/tempo';

const parts = formatRangeParts(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'UTC',
});
// [{ type: 'month', value: '3', source: 'shared' }, ...]

// Render only the start part
const startParts = parts.filter((p) => p.source === 'startRange' || p.source === 'shared');
```

---

### `formatRelative(input, options?): string`

```ts
formatRelative(input: RelativeTimeInput, options?: RelativeFormatOptions): string;
```

Returns a UX-friendly relative time string ("in 2 hours", "3 days ago") using `Intl.RelativeTimeFormat`. When `options.base` is omitted, the current instant is used.

**Parameters — `RelativeFormatOptions`:**

| Option    | Type                             | Default  | Description                                              |
| --------- | -------------------------------- | -------- | -------------------------------------------------------- |
| `base`    | `RelativeTimeInput`              | `now`    | Reference point for the relative calculation             |
| `locale`  | `Intl.LocalesArgument`           | system   | BCP 47 locale tag                                        |
| `numeric` | `Intl.RelativeTimeFormatNumeric` | `'auto'` | `'always'` forces "1 day ago"; `'auto'` uses "yesterday" |
| `style`   | `Intl.RelativeTimeFormatStyle`   | `'long'` | `'short'` or `'narrow'` for compact labels               |

Unit selection uses approximate thresholds: differences under 60 s → `'second'`, under 60 min → `'minute'`, under 24 h → `'hour'`, under 7 d → `'day'`, under ~4.35 weeks → `'week'`, under 12 months → `'month'`, otherwise `'year'`. These thresholds use fixed second constants (1 month ≈ 30.4375 days) and do not account for DST — use `difference()` with `ZonedDateTime` inputs for calendar-accurate results.

**Example:**

```ts
import { formatRelative, parseInstant } from '@vielzeug/tempo';

const base = parseInstant('2026-03-21T10:00:00Z');

formatRelative(parseInstant('2026-03-21T12:00:00Z'), { base, locale: 'en-US', numeric: 'always' });
// → 'in 2 hours'

formatRelative(parseInstant('2026-03-19T10:00:00Z'), { base, locale: 'en-US' });
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

| Option   | Type                                         | Default  | Description       |
| -------- | -------------------------------------------- | -------- | ----------------- |
| `locale` | `Intl.LocalesArgument`                       | system   | BCP 47 locale tag |
| `style`  | `'digital' \| 'long' \| 'narrow' \| 'short'` | `'long'` | Display style     |

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

- Returns `null` when no threshold matches.
- Requires `options.tz` when input is `PlainDate` or `PlainDateTime`.
- Pass `now` to fix the reference point (useful in tests).

**Negative thresholds classify past dates.** A threshold of `{ days: -N }` matches dates that are more than N days in the _past_ (i.e. `diff ≤ -N days`). Use negative thresholds at the front of your map for "expired" or "overdue" buckets:

```ts
const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days ago
  expired: { days: 0 }, // any past date (diff ≤ 0)
  critical: { days: 3 }, // within 3 days in the future
  warning: { days: 14 },
  safe: { years: 100 },
} as const;
```

**Performance:** define threshold objects at module scope (not inline literals) so the internal `WeakMap` sort-cache is effective.

**Example:**

```ts
import { expires } from '@vielzeug/tempo';

const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days past
  expired: { days: 0 }, // any past date
  critical: { days: 3 }, // within 3 days
  warning: { days: 14 }, // within 14 days
  safe: { years: 100 }, // catch-all far future
} as const;

expires(Temporal.Now.instant().subtract({ days: 60 }), THRESHOLDS); // 'longExpired'
expires(Temporal.Now.instant().subtract({ hours: 6 }), THRESHOLDS); // 'expired'
expires(Temporal.Now.instant().add({ hours: 48 }), THRESHOLDS); // 'critical'
expires(Temporal.Now.instant().add({ days: 10 }), THRESHOLDS); // 'warning'
expires(Temporal.Now.instant().add({ years: 1 }), THRESHOLDS); // 'safe'

// No threshold matches — returns null
expires(Temporal.Now.instant().add({ years: 200 }), { soon: { days: 3 } }); // null
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
import { parseInstant, parseZoned, timeDiff } from '@vielzeug/tempo';

// No tz needed for two Instants — uses ms arithmetic (1 year ≈ 365.25 days)
// 2026-01 → 2027-06 ≈ 17 months; floor(17/12) = 1, so unit is 'year', value is 1
timeDiff(parseInstant('2026-01-01T00:00:00Z'), parseInstant('2027-06-01T00:00:00Z')); // { unit: 'year', value: 1 }

// b defaults to now
timeDiff(Temporal.Now.instant().subtract({ hours: 3 })); // { unit: 'hour', value: 3 }

// Calendar-accurate with tz
timeDiff(parseInstant('2026-01-01T00:00:00Z'), parseZoned('2026-06-15T00:00:00[UTC]'), {
  tz: 'UTC',
}); // { unit: 'month', value: 5 }
```

---

### `humanize(diff, options?): string`

```ts
humanize(diff: TimeDiffResult, options?: { locale?: Intl.LocalesArgument }): string;
```

Converts a `TimeDiffResult` to a human-readable string. Uses the singular form when `value === 1`, plural otherwise. Unit names are **English-only** — use `formatRelative()` or `formatDuration()` for fully localized output.

**Parameters — `options`:**

| Option   | Type                   | Default     | Description                                         |
| -------- | ---------------------- | ----------- | --------------------------------------------------- |
| `locale` | `Intl.LocalesArgument` | `undefined` | Locale for the numeric part via `Intl.NumberFormat` |

**Returns:** `string`

**Example:**

```ts
import { humanize, timeDiff } from '@vielzeug/tempo';

humanize({ unit: 'day', value: 1 }); // '1 day'
humanize({ unit: 'hour', value: 7 }); // '7 hours'
humanize({ unit: 'millisecond', value: 0 }); // '0 milliseconds'
humanize({ unit: 'day', value: 3 }, { locale: 'ar' }); // '٣ days'

// Typical combined usage
humanize(timeDiff(publishedAt)); // '3 days'
```

## Range and Recurrence

### `dateRange(start, end, step, options?): Generator<Temporal.ZonedDateTime>`

```ts
dateRange(
  start: TimeInput,
  end: TimeInput,
  step: Temporal.DurationLike,
  options?: TimeOptions,
): Generator<Temporal.ZonedDateTime>;
```

Lazily generates `ZonedDateTime` values between `start` and `end` (inclusive), advancing by `step`. Returns a generator — use `for...of` for lazy consumption or spread (`[...dateRange(...)]`) to collect into an array. Returns nothing when `start > end`. Throws `RangeError` if `step` does not advance the date forward.

When `start` is a `ZonedDateTime`, `options.tz` is inferred from it automatically. If `end` is in a different timezone it is silently re-projected into `start`'s timezone. Pass `options.tz` explicitly to override. For plain inputs, `options.tz` is required.

**Example:**

```ts
import { dateRange, parsePlainDate, parseZoned } from '@vielzeug/tempo';

const start = parseZoned('2026-03-01T00:00:00[UTC]');
const end = parseZoned('2026-03-31T00:00:00[UTC]');

// ZonedDateTime inputs — tz inferred, no need to pass options
for (const day of dateRange(start, end, { days: 1 })) {
  render(day);
  if (someCondition) break; // safe to break early
}

// Collect to array
const days = [...dateRange(start, end, { days: 1 })];
// [Mar 1, Mar 2, ..., Mar 31]

// Plain inputs still require tz
const days = [...dateRange(parsePlainDate('2026-03-01'), parsePlainDate('2026-03-31'), { days: 1 }, { tz: 'UTC' })];
```

---

### `recurrence(start, rule, options?): Generator<Temporal.ZonedDateTime>`

```ts
recurrence(
  start: TimeInput,
  rule: RecurrenceRule,
  options?: TimeOptions,
): Generator<Temporal.ZonedDateTime>;
```

Lazily generates `ZonedDateTime` occurrences according to a recurrence rule. Supports `daily`, `weekly`, `monthly`, and `yearly` frequencies.

Either `count` or `until` (or both) **must** be provided — this is enforced at compile time by the `RecurrenceRule` type and validated eagerly at call time for JavaScript callers. When `start` is a `ZonedDateTime`, `options.tz` is inferred automatically.

**Parameters — `RecurrenceRule`:**

| Field       | Type                                           | Required                                   | Description                           |
| ----------- | ---------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| `frequency` | `'daily' \| 'weekly' \| 'monthly' \| 'yearly'` | <sg-icon name="check" size="16"></sg-icon> | Recurrence frequency                  |
| `interval`  | `number`                                       | —                                          | Step multiplier (default `1`)         |
| `count`     | `number`                                       | One of these two                           | Maximum number of occurrences to emit |
| `until`     | `TimeInput`                                    | One of these two                           | Inclusive end boundary                |

**Example:**

```ts
import { parseInstant, parseZoned, recurrence } from '@vielzeug/tempo';

const start = parseZoned('2026-01-05T09:00:00[Europe/Berlin]');

// ZonedDateTime start — tz inferred, no options needed
const mondays = [...recurrence(start, { frequency: 'weekly', count: 4 })];

// Bi-weekly meetings until a deadline
const deadline = parseZoned('2026-06-30T00:00:00[Europe/Berlin]');
for (const meeting of recurrence(start, { frequency: 'weekly', interval: 2, until: deadline })) {
  schedule(meeting);
}

// Plain input — tz required
const quarters = [
  ...recurrence(parseInstant('2026-01-05T09:00:00Z'), { frequency: 'monthly', interval: 3, count: 6 }, { tz: 'UTC' }),
];
```

## Types

```ts
type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;

type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/** Discriminant for the parse() `as` parameter. Controls the expected return type. */
type ParseAs = 'instant' | 'plain-date' | 'plain-datetime' | 'zoned';

type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';

// Discriminated union — intl and pattern are mutually exclusive
type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; pattern?: never; tz?: string }
  | { intl?: never; locale?: Intl.LocalesArgument; pattern?: FormatPattern; tz?: string };

type TempoUnit =
  | 'day'
  | 'hour'
  | 'microsecond'
  | 'millisecond'
  | 'minute'
  | 'month'
  | 'nanosecond'
  | 'second'
  | 'week'
  | 'year';

type CalendarUnit = Extract<TempoUnit, 'day' | 'month' | 'week' | 'year'>;
type BoundaryUnit = Exclude<TempoUnit, 'microsecond' | 'millisecond' | 'nanosecond' | 'second'>;
type TimeDiffUnit = Exclude<TempoUnit, 'microsecond' | 'nanosecond'>;
type TimeDiffResult = { unit: TimeDiffUnit; value: number };
type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Either count or until (or both) must be provided
type RecurrenceRule = {
  frequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
  interval?: number;
} & ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });

interface TimeOptions {
  tz?: string;
}

interface DisambiguationOptions {
  prefer?: DateTimeDisambiguation;
}

interface ShiftOptions extends DisambiguationOptions, TimeOptions {}

interface DifferenceOptions extends DisambiguationOptions, TimeOptions {
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
