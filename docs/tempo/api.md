---
title: Tempo — API Reference
description: Reference for Tempo Temporal parsing, conversion, arithmetic, formatting, and classification APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `parse()` | Parse ISO text to an explicit Temporal kind | Sync | `as` is required |
| `isValid()` | Narrow an unknown runtime value to `TimeInput` | Sync | Does not parse strings |
| `toInstant()` | Resolve a value as an absolute instant | Sync | Plain values require `timeZone` |
| `inTimeZone()` | Project a value to a zone | Sync | Preserves instant, changes wall-clock fields |
| `shift()` / `difference()` | DST-safe arithmetic | Sync | Calendar work needs a timezone |
| `contains()` / `clamp()` | Named range operations | Sync | Bounds normalize automatically |
| `classifyExpiry()` | Classify fixed elapsed-time thresholds | Sync | Use milliseconds or larger units; months and years are rejected |
| `format()` family | Localized and machine formatting | Sync | Use `timeZone`, not `tz` |
| `dateRange()` / `recurrence()` | Lazy zoned sequences | Sync | Plain inputs need `timeZone` |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/tempo` | Tempo utilities, errors, types, and shared `Temporal` namespace |

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

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `string` | ISO 8601 input |
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

### `toInstant(input, options?)` / `inTimeZone(input, timeZone)`

```ts
toInstant(input: AbsoluteTime): Temporal.Instant;
toInstant(input: WallTime, options: { timeZone: string; disambiguation?: Disambiguation }): Temporal.Instant;
inTimeZone(input: TimeInput, timeZone: string): Temporal.ZonedDateTime;
```

`toInstant()` resolves wall-clock values. `inTimeZone()` projects a value into a requested timezone.

**Example:**

```ts
import { inTimeZone, parse, toInstant } from '@vielzeug/tempo';

const local = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });
const instant = toInstant(local, { disambiguation: 'later', timeZone: 'America/New_York' });
inTimeZone(instant, 'Europe/Berlin');
```

---

### `shift(input, duration, options?)`

```ts
shift(input: TimeInput, duration: Temporal.DurationLike, options?: ShiftOptions): Temporal.ZonedDateTime;
```

Adds a duration through Temporal calendar rules and returns a zoned value.

**Returns:** `Temporal.ZonedDateTime`.

**Example:**

```ts
import { parse, shift } from '@vielzeug/tempo';

const before = parse('2026-03-08T01:30:00-05:00[America/New_York]', { as: 'zonedDateTime' });
shift(before, { hours: 1 });
```

---

### `difference({ start, end, ...options })`

```ts
difference(input: DifferenceInput): Temporal.Duration;
```

Returns duration from `start` to `end`.

**Example:**

```ts
import { difference, parse } from '@vielzeug/tempo';

const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });
difference({ end, largestUnit: 'hour', start });
```

## Range and Comparison

### `contains({ value, start, end, ...options })`

```ts
contains(input: ContainsInput): boolean;
```

Returns whether `value` lies in inclusive normalized bounds.

### `clamp({ value, start, end, ...options })`

```ts
clamp(input: ClampInput): Temporal.Instant | Temporal.ZonedDateTime;
```

Returns the nearest bound when `value` falls outside the range.

### `isBefore(a, b, options?)` / `isAfter(a, b, options?)` / `isSame(a, b, options?)`

```ts
isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
```

Compare absolute values or calendar boundaries when `unit` is supplied.

### `startOf(input, unit, options?)` / `endOf(input, unit, options?)`

```ts
startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
endOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
```

Returns the first or last nanosecond of the requested boundary unit.

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

### `formatInstant()` / `formatZoned()` / `formatRelative()` / `formatDuration()`

```ts
formatInstant(input: TimeInput, options?: TimeZoneOptions): string;
formatZoned(input: TimeInput, options?: TimeZoneOptions): string;
formatRelative(input: RelativeTimeInput, options?: RelativeFormatOptions): string;
formatDuration(input: string | Temporal.DurationLike, options?: DurationFormatOptions): string;
```

`formatInstant()` produces UTC transport text (`timeZone` needed for wall-time input, ignored for `Instant`). `formatZoned()` produces zoned ISO text (`timeZone` required for non-`ZonedDateTime` input). `formatDuration()` falls back to English when `Intl.DurationFormat` is unavailable.

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

Return `Intl` parts or localized range strings using `FormatOptions`.

### `parseDuration()` / `humanize()`

```ts
parseDuration(input: string | Temporal.DurationLike): Temporal.Duration;
humanize(diff: TimeDiffResult, options?: { locale?: Intl.LocalesArgument }): string;
```

`humanize()` localizes numbers only. Unit names remain English.

## Classification and Sequences

### `classifyExpiry({ value, thresholds, relativeTo?, timeZone? })`

```ts
classifyExpiry<K extends string>(input: ClassifyExpiryInput<K>): K | null;
```

Classifies an expiry against fixed elapsed-time thresholds in milliseconds or larger units. Months and years throw `TempoInvalidInputError`.

### `timeDiff(a, b?, options?)`

```ts
timeDiff(a: TimeInput, b?: TimeInput, options?: TimeZoneOptions): TimeDiffResult;
```

Returns absolute calendar difference in its largest meaningful unit.

### `dateRange()` / `recurrence()`

```ts
dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options?: TimeZoneOptions): Generator<Temporal.ZonedDateTime>;
recurrence(start: TimeInput, rule: RecurrenceRule, options?: TimeZoneOptions): Generator<Temporal.ZonedDateTime>;
```

Returns lazy `ZonedDateTime` sequences.

## Types

```ts
type AbsoluteTime = Temporal.Instant | Temporal.ZonedDateTime;
type WallTime = Temporal.PlainDate | Temporal.PlainDateTime;
type TimeInput = AbsoluteTime | WallTime;
type RelativeTimeInput = AbsoluteTime;
type ParseAs = 'instant' | 'plainDate' | 'plainDateTime' | 'zonedDateTime';
type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';
type TempoUnit = 'day' | 'hour' | 'microsecond' | 'millisecond' | 'minute' | 'month' | 'nanosecond' | 'second' | 'week' | 'year';
type CalendarUnit = Extract<TempoUnit, 'day' | 'month' | 'week' | 'year'>;
type BoundaryUnit = Exclude<TempoUnit, 'microsecond' | 'millisecond' | 'nanosecond' | 'second'>;
type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type FixedDuration = Pick<Temporal.DurationLike, 'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'nanoseconds' | 'seconds' | 'weeks'>;
type ExpiryThresholds<K extends string> = Record<K, FixedDuration>;
type TimeDiffUnit = Exclude<TempoUnit, 'microsecond' | 'nanosecond'>;
type TimeDiffResult = { unit: TimeDiffUnit; value: number };
type RecurrenceRule =
  | { frequency: 'daily' | 'monthly' | 'weekly' | 'yearly'; interval?: number; count: number; until?: TimeInput }
  | { frequency: 'daily' | 'monthly' | 'weekly' | 'yearly'; interval?: number; count?: number; until: TimeInput };

interface TimeZoneOptions { timeZone?: string }
interface DisambiguationOptions { disambiguation?: Disambiguation }
interface ShiftOptions extends DisambiguationOptions, TimeZoneOptions {}
interface DifferenceInput extends DisambiguationOptions, TimeZoneOptions {
  start: TimeInput;
  end: TimeInput;
  largestUnit?: Temporal.DateTimeUnit;
  smallestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
}
type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; pattern?: never; timeZone?: string }
  | { intl?: never; locale?: Intl.LocalesArgument; pattern?: FormatPattern; timeZone?: string };
interface RelativeFormatOptions {
  base?: RelativeTimeInput;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}
interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}
interface BoundaryOptions extends TimeZoneOptions { weekStartsOn?: WeekStartDay }
interface CompareOptions extends TimeZoneOptions { unit?: BoundaryUnit; weekStartsOn?: WeekStartDay }
interface ContainsInput extends CompareOptions { value: TimeInput; start: TimeInput; end: TimeInput }
interface ClampInput extends CompareOptions { value: TimeInput; start: TimeInput; end: TimeInput }
interface ClassifyExpiryInput<K extends string> extends TimeZoneOptions {
  value: TimeInput;
  thresholds: ExpiryThresholds<K>;
  relativeTo?: Temporal.Instant;
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `TempoError` | Base Tempo error | `instanceof TempoError` narrows every subtype |
| `TempoInvalidInputError` | Invalid parse, duration, or fixed-threshold input | Extends `TempoError` |
| `TempoInvalidTzError` | Invalid IANA zone or offset | Extends `TempoError` |
| `TempoMissingTzError` | Wall time without required `timeZone` | Extends `TempoError` |
| `TempoUnsupportedInputError` | Non-Temporal input passed to conversion | Extends `TempoError` |
