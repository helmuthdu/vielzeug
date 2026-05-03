export const timitTypes = `
declare module '@vielzeug/timit' {
  export { Temporal };

  export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

  export type TimeInput =
    | Temporal.Instant
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | string;

  export interface TimeOptions {
    tz?: string;
    when?: DateTimeDisambiguation;
  }

  export interface DifferenceOptions extends TimeOptions {
    largestUnit?: Temporal.DateTimeUnit;
    roundingIncrement?: number;
    roundingMode?: Temporal.RoundingMode;
    smallestUnit?: Temporal.DateTimeUnit;
  }

  export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

  export interface HumanFormatOptions {
    pattern?: FormatPattern;
    locale?: Intl.LocalesArgument;
    tz?: string;
    intl?: Intl.DateTimeFormatOptions;
  }

  export const timit: {
    now(tz?: string): Temporal.ZonedDateTime;
    parse(input: string): Temporal.PlainDateTime;
    toInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
    toZoned(input: TimeInput, options?: TimeOptions): Temporal.ZonedDateTime;
    add(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
    difference(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;
    within(value: TimeInput, start: TimeInput, end: TimeInput, options?: TimeOptions): boolean;
    format(input: TimeInput, options?: HumanFormatOptions): string;
    formatIso(input: TimeInput, options?: TimeOptions): string;
    formatRange(start: TimeInput, end: TimeInput, options?: HumanFormatOptions): string;
  };
}
`;
