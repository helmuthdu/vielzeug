import { Temporal } from '@js-temporal/polyfill';

// ─── Input types ──────────────────────────────────────────────────────────────

export type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
export type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

// ─── Option types ─────────────────────────────────────────────────────────────

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export interface TimeOptions {
  prefer?: DateTimeDisambiguation;
  tz?: string;
}

export type TimeOptionsWithTz = TimeOptions & { tz: string };

export interface DifferenceOptions extends TimeOptions {
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
 * `intl` and `pattern` are mutually exclusive — enforced at the type level.
 */
export type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; tz?: string }
  | { locale?: Intl.LocalesArgument; pattern?: FormatPattern; tz?: string };

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

// ─── Boundary / comparison types ──────────────────────────────────────────────

export type BoundaryUnit = 'day' | 'hour' | 'minute' | 'month' | 'week' | 'year';
export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoundaryOptions extends TimeOptions {
  weekStartsOn?: WeekStartDay;
}

export interface CompareOptions extends TimeOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}

// ─── Classify types ───────────────────────────────────────────────────────────

/** Structured output of {@link timeDiff}. */
export type TimeDiffUnit = 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'second' | 'week' | 'year';
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
