export const tempoTypes = `
declare module '/tempo' {
  export { Temporal };

  // ─── Input types ─────────────────────────────────────────────────────────────

  export type TimeInput =
    | Temporal.Instant
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;

  export type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

  /** Discriminant for the parse() \`as\` parameter. Controls the expected return type. */
  export type ParseAs = 'instant' | 'plain-date' | 'plain-datetime' | 'zoned';

  // ─── Unit types ──────────────────────────────────────────────────────────────

  export type TempoUnit =
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

  export type CalendarUnit = Extract<TempoUnit, 'day' | 'month' | 'week' | 'year'>;
  export type BoundaryUnit = Exclude<TempoUnit, 'microsecond' | 'millisecond' | 'nanosecond' | 'second'>;
  export type TimeDiffUnit = Exclude<TempoUnit, 'microsecond' | 'nanosecond'>;
  export type TimeDiffResult = { unit: TimeDiffUnit; value: number };
  export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

  // ─── Option types ────────────────────────────────────────────────────────────

  export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
  export type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';

  export interface TimeOptions {
    tz?: string;
  }

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

  export interface BoundaryOptions extends TimeOptions {
    weekStartsOn?: WeekStartDay;
  }

  export interface CompareOptions extends TimeOptions {
    unit?: BoundaryUnit;
    weekStartsOn?: WeekStartDay;
  }

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

  export type RecurrenceRule = {
    count?: number;
    frequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
    interval?: number;
    until?: TimeInput;
  } & ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });

  // ─── Constructors / parsers ──────────────────────────────────────────────────

  export function now(tz: string): Temporal.ZonedDateTime;
  export function nowInstant(): Temporal.Instant;

  export function parse(input: string, as: 'zoned'): Temporal.ZonedDateTime;
  export function parse(input: string, as: 'instant'): Temporal.Instant;
  export function parse(input: string, as: 'plain-datetime'): Temporal.PlainDateTime;
  export function parse(input: string, as: 'plain-date'): Temporal.PlainDate;
  export function parse(input: string, as?: ParseAs): TimeInput;

  export function parseInstant(input: string): Temporal.Instant;
  export function parsePlainDate(input: string): Temporal.PlainDate;
  export function parsePlainDateTime(input: string): Temporal.PlainDateTime;
  export function parseZoned(input: string): Temporal.ZonedDateTime;
  export function isValid(value: unknown): value is TimeInput;

  // ─── Conversion ──────────────────────────────────────────────────────────────

  export function toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
  export function inTz(input: TimeInput, tz: string): Temporal.ZonedDateTime;

  // ─── Arithmetic ──────────────────────────────────────────────────────────────

  export function shift(input: TimeInput, duration: Temporal.DurationLike, options?: ShiftOptions): Temporal.ZonedDateTime;
  export function difference(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;

  // ─── Comparison ──────────────────────────────────────────────────────────────

  export function within(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): boolean;
  export function clamp(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): Temporal.Instant;
  export function isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
  export function isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
  export function isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;

  // ─── Boundaries ──────────────────────────────────────────────────────────────

  export function startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
  export function endOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;

  // ─── Formatting ──────────────────────────────────────────────────────────────

  export function format(input: TimeInput, options?: FormatOptions): string;
  export function formatRange(start: TimeInput, end: TimeInput, options?: FormatOptions): string;
  export function formatRangeParts(start: TimeInput, end: TimeInput, options?: FormatOptions): Intl.DateTimeRangeFormatPart[];
  export function formatParts(input: TimeInput, options?: FormatOptions): Intl.DateTimeFormatPart[];
  export function formatInstant(input: TimeInput, options?: TimeOptions): string;
  export function formatZoned(input: TimeInput, options?: TimeOptions): string;
  export function formatRelative(input: RelativeTimeInput, options?: RelativeFormatOptions): string;
  export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration;
  export function formatDuration(input: string | Temporal.DurationLike, options?: DurationFormatOptions): string;

  // ─── Classification ──────────────────────────────────────────────────────────

  export function expires<K extends string>(date: TimeInput, thresholds: Record<K, Temporal.DurationLike>, options?: TimeOptions, now?: Temporal.Instant): K | null;
  export function timeDiff(a: TimeInput, b?: TimeInput, options?: TimeOptions): TimeDiffResult;
  export function humanize(diff: TimeDiffResult, options?: { locale?: Intl.LocalesArgument }): string;

  // ─── Range / recurrence ──────────────────────────────────────────────────────

  export function dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options?: TimeOptions): Generator<Temporal.ZonedDateTime>;
  export function recurrence(start: TimeInput, rule: RecurrenceRule, options?: TimeOptions): Generator<Temporal.ZonedDateTime>;
}
`;
