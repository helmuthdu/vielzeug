---
title: 'Tempo: API Reference'
description: Reference for Tempo Temporal parsing, conversion, arithmetic, comparison, boundary, and formatting APIs.
---

[[toc]]

## API Overview

| Symbol                                  | Purpose                                        | Execution mode | Common gotcha                                |
| --------------------------------------- | ---------------------------------------------- | -------------- | -------------------------------------------- |
| `parse()`                               | Parse ISO text to an explicit Temporal kind    | Sync           | `as` is required                             |
| `isValid()`                             | Narrow an unknown runtime value to `TimeInput` | Sync           | Does not parse strings                       |
| `toInstant()`                           | Resolve a value as an absolute instant         | Sync           | Plain values require `timeZone`              |
| `toZoned()`                             | Project a value to a zone                      | Sync           | Preserves instant, changes wall-clock fields |
| `shift()` / `difference()`              | Timezone-aware arithmetic                      | Sync           | Calendar operations require a timezone       |
| `isBefore()` / `isAfter()` / `isSame()` | Compare absolute values or calendar units      | Sync           | Plain values require `timeZone`              |
| `startOf()` / `endOf()`                 | Resolve calendar boundaries                    | Sync           | Weeks default to Monday                      |
| `format()` family                       | Localized and machine formatting               | Sync           | Use `timeZone`, not `tz`                     |

## Package Entry Point

| Import                    | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `@vielzeug/tempo`         | Tempo utilities, errors, types, and shared `Temporal` namespace                          |
| `@vielzeug/tempo/cadence` | RFC 5545 recurrence: `parseCadence`, `toCadence`, `expandCadence`, `resolveCadenceDates` |

Cadence has its own reference: [Cadence](./cadence.md).

## Core Functions

### `parse(input, { as })`

```ts
parse(input: string, options: { as: 'instant' }): Temporal.Instant;
parse(input: string, options: { as: 'zonedDateTime' }): Temporal.ZonedDateTime;
parse(input: string, options: { as: 'plainDateTime' }): Temporal.PlainDateTime;
parse(input: string, options: { as: 'plainDate' }): Temporal.PlainDate;
```

Parses an ISO 8601 string as the requested temporal kind.

**Parameters**

| Parameter    | Type      | Description          |
| ------------ | --------- | -------------------- |
| `input`      | `string`  | ISO 8601 input       |
| `options.as` | `ParseAs` | Required result kind |

**Returns:** Requested Temporal value.

**Example:**

```ts
import { parse } from '@vielzeug/tempo';

const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });
```

---

### `isValid(value)`

```ts
isValid(value: unknown): value is TimeInput;
```

Returns whether `value` is a Tempo-supported Temporal value. It does not parse ISO strings.

**Example:**

```ts
import { isValid, parse } from '@vielzeug/tempo';

const value: unknown = parse('2026-03-21T10:15:30Z', { as: 'instant' });
const valid = isValid(value); // true
```

---

### `now({ timeZone })` / `nowInstant()`

```ts
now(options: { timeZone: string }): Temporal.ZonedDateTime;
nowInstant(): Temporal.Instant;
```

Returns current zoned or absolute time.

**Example:**

```ts
import { now, nowInstant } from '@vielzeug/tempo';

now({ timeZone: 'Europe/Berlin' });
nowInstant();
```

---

### `toInstant(input, options?)` / `toZoned(input, options)`

```ts
toInstant(input: AbsoluteTime): Temporal.Instant;
toInstant(input: WallTime, options: { timeZone: string } & DisambiguationOptions): Temporal.Instant;
toZoned(input: TimeInput, options: { timeZone: string } & DisambiguationOptions): Temporal.ZonedDateTime;
```

`toInstant()` resolves wall-clock values to an absolute instant. `toZoned()` projects any value into a required timezone, preserving the instant.

**Example:**

```ts
import { parse, toInstant, toZoned } from '@vielzeug/tempo';

const local = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });
const instant = toInstant(local, { disambiguation: 'later', timeZone: 'America/New_York' });
toZoned(instant, { timeZone: 'Europe/Berlin' });
```

---

## Arithmetic and Comparison

### `shift(input, duration, options?)`

```ts
shift(input: Temporal.ZonedDateTime, duration: Temporal.DurationLike, options?: ShiftOptions): Temporal.ZonedDateTime;
shift(input: Exclude<TimeInput, Temporal.ZonedDateTime>, duration: Temporal.DurationLike, options: ShiftOptions & { timeZone: string }): Temporal.ZonedDateTime;
```

Adds a duration through zoned calendar rules.

**Returns:** `Temporal.ZonedDateTime`.

---

### `difference({ start, end, ...options })`

```ts
difference(input: DifferenceInput): Temporal.Duration;
```

Returns the signed duration from `start` to `end` with optional Temporal rounding.

**Returns:** `Temporal.Duration`.

---

### `isBefore()` / `isAfter()` / `isSame()`

```ts
isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Compare absolute instants or their containing calendar units.

**Returns:** A boolean comparison result.

---

### `startOf()` / `endOf()`

```ts
startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
endOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
```

Returns the first or last nanosecond of a timezone-aware calendar unit.

**Returns:** `Temporal.ZonedDateTime`.

## Formatting

### `format(input, options?)`

```ts
format(input: TimeInput, options?: FormatOptions): string;
```

Formats a value through `Intl.DateTimeFormat`.

**Example:**

```ts
import { format, parse } from '@vielzeug/tempo';

format(parse('2026-03-21T10:15:30Z', { as: 'instant' }), {
  locale: 'en-GB',
  pattern: 'short',
  timeZone: 'UTC',
});
```

### `formatInstant()` / `formatZoned()` / `formatRelative()` / `formatDuration()` / `formatTimer()`

```ts
formatInstant(input: TimeInput, options?: TimeZoneOptions): string;
formatZoned(input: TimeInput, options?: TimeZoneOptions): string;
formatRelative(input: AbsoluteTime, options?: RelativeFormatOptions): string;
formatDuration(input: string | Temporal.DurationLike, options?: DurationFormatOptions): string;
formatTimer(input: string | Temporal.DurationLike, options?: TimerFormatOptions): string;
```

`formatInstant()` produces UTC transport text (`timeZone` needed for wall-time input, ignored for `Instant`). `formatZoned()` produces zoned ISO text (`timeZone` required for non-`ZonedDateTime` input). `formatRelative()` uses fixed units for short spans and complete calendar months or years in the requested or inferred timezone. Zoned inputs with different zones require `options.timeZone`. `formatDuration()` falls back to English when `Intl.DurationFormat` is unavailable. `formatTimer()` renders a stopwatch-style clock: `47:12` under an hour, `1:02:35` from an hour up: deterministic and locale-independent; sub-second parts are truncated, negative durations clamp to zero, `days` fold into hours, and durations above days throw `TempoInvalidInputError`.

### `formatParts()` / `formatRange()` / `formatRangeParts()`

```ts
formatParts(input: TimeInput, options?: FormatOptions): Intl.DateTimeFormatPart[];
formatRange(start: TimeInput, end: TimeInput, options?: FormatOptions): string;
formatRangeParts(
  start: TimeInput,
  end: TimeInput,
  options?: FormatOptions,
): ReturnType<Intl.DateTimeFormat['formatRangeToParts']>;
```

Return `Intl` parts or localized range strings using `FormatOptions`. Range inputs are order-free: reversed bounds format like the sorted pair.

### `parseDuration()`

```ts
parseDuration(input: string | Temporal.DurationLike): Temporal.Duration;
```

Parses an ISO 8601 duration string or `Temporal.DurationLike` into a `Temporal.Duration`.

## Types

```ts
type AbsoluteTime = Temporal.Instant | Temporal.ZonedDateTime;
type WallTime = Temporal.PlainDate | Temporal.PlainDateTime;
type TimeInput = AbsoluteTime | WallTime;
type ParseAs = 'instant' | 'plainDate' | 'plainDateTime' | 'zonedDateTime';
type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
type CalendarUnit = 'day' | 'month' | 'week' | 'year';
type BoundaryUnit = 'day' | 'hour' | 'minute' | 'month' | 'week' | 'year';
type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';
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
interface TimeZoneOptions {
  timeZone?: string;
}
interface DisambiguationOptions {
  disambiguation?: Disambiguation;
}
interface ShiftOptions extends DisambiguationOptions, TimeZoneOptions {}
interface DifferenceInput extends DisambiguationOptions, TimeZoneOptions {
  end: TimeInput;
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
  start: TimeInput;
}
interface BoundaryOptions extends TimeZoneOptions {
  weekStartsOn?: WeekStartDay;
}
interface CompareOptions extends TimeZoneOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}
type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; pattern?: never; timeZone?: string }
  | { intl?: never; locale?: Intl.LocalesArgument; pattern?: FormatPattern; timeZone?: string };
interface RelativeFormatOptions extends TimeZoneOptions {
  base?: AbsoluteTime;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}
interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}
```

## Errors

| Error                        | Trigger                                 | Notable properties                            |
| ---------------------------- | --------------------------------------- | --------------------------------------------- |
| `TempoError`                 | Base Tempo error                        | `instanceof TempoError` narrows every subtype |
| `CadenceError`               | Cadence rule cannot be parsed/expanded  | Also exported from `@vielzeug/tempo/cadence`  |
| `TempoInvalidInputError`     | Invalid parse or duration input         | Extends `TempoError`                          |
| `TempoInvalidTzError`        | Invalid IANA zone or offset             | Extends `TempoError`                          |
| `TempoMissingTzError`        | Wall time without required `timeZone`   | Extends `TempoError`                          |
| `TempoUnsupportedInputError` | Non-Temporal input passed to conversion | Extends `TempoError`                          |

Every Tempo error thrown from `parse()`, `parseDuration()`, and timezone validation carries the original Temporal error on its `cause` property (ES2022). Inspect `err.cause` for root-cause details when debugging.
