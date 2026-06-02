export const tempoTypes = `
declare module '/tempo' {
  export { Temporal };

  export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

  export type TimeInput =
    | Temporal.Instant
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;

  export type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

  export type FormatPattern = 'date-only' | 'long' | 'medium' | 'short' | 'time-only';

  export type BoundaryUnit = 'day' | 'hour' | 'minute' | 'month' | 'week' | 'year';

  export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

  export type TimeDiffUnit = 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'second' | 'week' | 'year';

  export type TimeDiffResult = { unit: TimeDiffUnit; value: number };

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

  export interface BoundaryOptions extends TimeOptions {
    weekStartsOn?: WeekStartDay;
  }

  export interface CompareOptions extends TimeOptions {
    unit?: BoundaryUnit;
    weekStartsOn?: WeekStartDay;
  }

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

  export type RecurrenceRule = {
    count?: number;
    frequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
    interval?: number;
    until?: TimeInput;
  } & ({ count: number; until?: TimeInput } | { count?: number; until: TimeInput });

  // ─── Constructors / parsers ──────────────────────────────────────────────────

  export function now(tz: string): Temporal.ZonedDateTime;
  export function nowInstant(): Temporal.Instant;
  export function parseDate(input: string): TimeInput;
  export function parseInstant(input: string): Temporal.Instant;
  export function parsePlainDate(input: string): Temporal.PlainDate;
  export function parsePlainDateTime(input: string): Temporal.PlainDateTime;
  export function parseZoned(input: string): Temporal.ZonedDateTime;
  export function isValid(value: unknown): value is TimeInput;

  // ─── Conversion ──────────────────────────────────────────────────────────────

  export function toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
  export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime;

  // ─── Arithmetic ──────────────────────────────────────────────────────────────

  export function shift(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
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

  export function expires<K extends string>(date: TimeInput, thresholds: Record<K, Temporal.DurationLike>, options?: TimeOptions): K | null;
  export function classify<K extends string>(date: TimeInput, thresholds: Record<K, Temporal.DurationLike>, options?: TimeOptions): { diff: TimeDiffResult; key: K | null };
  export function timeDiff(a: TimeInput, b?: TimeInput, options?: TimeOptions): TimeDiffResult;
  export function humanize(diff: TimeDiffResult): string;

  // ─── Range / recurrence ──────────────────────────────────────────────────────

  export function dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options?: TimeOptions): Generator<Temporal.ZonedDateTime>;
  export function recurrence(start: TimeInput, rule: RecurrenceRule, options?: TimeOptions): Generator<Temporal.ZonedDateTime>;
}
`;
