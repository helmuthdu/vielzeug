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

  export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

  export type BoundaryUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

  export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

  export type ExpiryStatus = 'EXPIRED' | 'LATER' | 'NEVER' | 'SOON';

  export type TimeDiffUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

  export type TimeDiffResult = { unit: TimeDiffUnit; value: number };

  export interface TimeOptions {
    tz?: string;
    when?: DateTimeDisambiguation;
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

  export type IsSameOptions = CompareOptions;

  export interface FormatOptions {
    intl?: Intl.DateTimeFormatOptions;
    locale?: Intl.LocalesArgument;
    pattern?: FormatPattern;
    tz?: string;
  }

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

  export function now(tz: string): Temporal.ZonedDateTime;
  export function parseLocal(input: string): Temporal.PlainDateTime;
  export function toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
  export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime;
  export function shift(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
  export function difference(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;
  export function within(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): boolean;
  export function clamp(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): Temporal.Instant;
  export function isBefore(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
  export function isAfter(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
  export function isSame(a: TimeInput, b: TimeInput, options?: CompareOptions): boolean;
  export function startOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
  export function endOf(input: TimeInput, unit: BoundaryUnit, options?: BoundaryOptions): Temporal.ZonedDateTime;
  export function format(input: TimeInput, options?: FormatOptions): string;
  export function formatRange(start: TimeInput, end: TimeInput, options?: FormatOptions): string;
  export function formatInstant(input: TimeInput, options?: TimeOptions): string;
  export function formatZoned(input: TimeInput, options?: TimeOptions): string;
  export function formatRelative(input: RelativeTimeInput, options?: RelativeFormatOptions): string;
  export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration;
  export function formatDuration(input: string | Temporal.DurationLike, options?: DurationFormatOptions): string;
  export function expires(date: TimeInput, days?: number, options?: TimeOptions): ExpiryStatus;
  export function timeDiff(a: TimeInput, b?: TimeInput, options?: TimeOptions): TimeDiffResult;
  export function dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options: TimeOptionsWithTz): Temporal.ZonedDateTime[];
  export function clearCaches(): void;
}
`;
