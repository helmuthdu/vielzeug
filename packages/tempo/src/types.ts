import { Temporal } from '@js-temporal/polyfill';

export type AbsoluteTime = Temporal.Instant | Temporal.ZonedDateTime;
export type WallTime = Temporal.PlainDate | Temporal.PlainDateTime;
export type TimeInput = AbsoluteTime | WallTime;
export type RelativeTimeInput = AbsoluteTime;

export type ParseAs = 'instant' | 'plainDate' | 'plainDateTime' | 'zonedDateTime';
export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export interface TimeZoneOptions {
  timeZone?: string;
}

export interface DisambiguationOptions {
  disambiguation?: Disambiguation;
}

export interface ShiftOptions extends DisambiguationOptions, TimeZoneOptions {}

export interface DifferenceInput extends DisambiguationOptions, TimeZoneOptions {
  end: TimeInput;
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
  start: TimeInput;
}

export type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';
export type FormatOptions =
  | { intl: Intl.DateTimeFormatOptions; locale?: Intl.LocalesArgument; pattern?: never; timeZone?: string }
  | { intl?: never; locale?: Intl.LocalesArgument; pattern?: FormatPattern; timeZone?: string };

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

export type TempoUnit =
  'day' | 'hour' | 'microsecond' | 'millisecond' | 'minute' | 'month' | 'nanosecond' | 'second' | 'week' | 'year';
export type CalendarUnit = Extract<TempoUnit, 'day' | 'month' | 'week' | 'year'>;
export type BoundaryUnit = Exclude<TempoUnit, 'microsecond' | 'millisecond' | 'nanosecond' | 'second'>;
export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoundaryOptions extends TimeZoneOptions {
  weekStartsOn?: WeekStartDay;
}

export interface CompareOptions extends TimeZoneOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}

export interface ContainsInput extends CompareOptions {
  end: TimeInput;
  start: TimeInput;
  value: TimeInput;
}

export interface ClampInput extends CompareOptions {
  end: TimeInput;
  start: TimeInput;
  value: TimeInput;
}

export type FixedDuration = Pick<
  Temporal.DurationLike,
  'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'nanoseconds' | 'seconds' | 'weeks'
>;
export type ExpiryThresholds<K extends string> = Record<K, FixedDuration>;
export interface ClassifyExpiryInput<K extends string> extends TimeZoneOptions {
  relativeTo?: Temporal.Instant;
  thresholds: ExpiryThresholds<K>;
  value: TimeInput;
}

export type TimeDiffUnit = Exclude<TempoUnit, 'microsecond' | 'nanosecond'>;
export type TimeDiffResult = { unit: TimeDiffUnit; value: number };

type RecurrenceBase = { frequency: 'daily' | 'monthly' | 'weekly' | 'yearly'; interval?: number };
export type RecurrenceRule = RecurrenceBase &
  ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });
