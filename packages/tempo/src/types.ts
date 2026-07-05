import { Temporal } from '@js-temporal/polyfill';

// ─── Input types ──────────────────────────────────────────────────────────────

export type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
export type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

/** Discriminant for the {@link parse} `as` parameter. Controls the expected return type. */
export type ParseAs = 'instant' | 'plain-date' | 'plain-datetime' | 'zoned';

// ─── Option types ─────────────────────────────────────────────────────────────

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/**
 * Base timezone option. Does NOT include `prefer` (disambiguation) — that only applies
 * to `PlainDateTime` inputs and is intentionally scoped to APIs where it is meaningful
 * (see {@link ShiftOptions} and {@link DifferenceOptions}).
 */
export interface TimeOptions {
  tz?: string;
}

/**
 * Options for DST-sensitive operations that accept `PlainDateTime` inputs.
 * `prefer` controls how ambiguous wall-clock times (e.g. during DST fall-back) are resolved.
 * It is silently ignored for `Instant` and `ZonedDateTime` inputs.
 */
export interface DisambiguationOptions {
  prefer?: DateTimeDisambiguation;
}

export interface ShiftOptions extends DisambiguationOptions, TimeOptions {}

export interface DifferenceOptions extends DisambiguationOptions, TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

// ─── Format option types ──────────────────────────────────────────────────────

export type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';

/**
 * Options for {@link format} and {@link formatRange}.
 *
 * `intl` and `pattern` are mutually exclusive — enforced at compile time.
 */
export type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; pattern?: never; tz?: string }
  | { intl?: never; locale?: Intl.LocalesArgument; pattern?: FormatPattern; tz?: string };

export interface RelativeFormatOptions {
  base?: RelativeTimeInput;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}

export interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}

// ─── Unit vocabulary ──────────────────────────────────────────────────────────

/** Master set of all temporal units recognised by tempo. */
export type TempoUnit =
  'day' | 'hour' | 'microsecond' | 'millisecond' | 'minute' | 'month' | 'nanosecond' | 'second' | 'week' | 'year';

/** Calendar-significant units (not sub-day). Used internally by CALENDAR_UNITS set. */
export type CalendarUnit = Extract<TempoUnit, 'day' | 'month' | 'week' | 'year'>;

// ─── Boundary / comparison types ──────────────────────────────────────────────

export type BoundaryUnit = Exclude<TempoUnit, 'microsecond' | 'millisecond' | 'nanosecond' | 'second'>;
export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoundaryOptions extends TimeOptions {
  weekStartsOn?: WeekStartDay;
}

export interface CompareOptions extends TimeOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}

// ─── Classify types ───────────────────────────────────────────────────────────

/** Structured output of {@link timeDiff}. Excludes sub-millisecond units. */
export type TimeDiffUnit = Exclude<TempoUnit, 'microsecond' | 'nanosecond'>;
export type TimeDiffResult = { unit: TimeDiffUnit; value: number };

// ─── Recurrence types ─────────────────────────────────────────────────────────

type RecurrenceBase = {
  frequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
  interval?: number;
};

/**
 * Rule governing {@link recurrence} generation.
 * Either `count` or `until` (or both) must be provided — enforced at the type level.
 */
export type RecurrenceRule = RecurrenceBase &
  ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });
