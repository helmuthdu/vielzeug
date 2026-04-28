import { Temporal } from '@js-temporal/polyfill';

export { Temporal };

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/**
 * Supported input types for date/time operations.
 * - Temporal types preserve timezone and disambiguation info
 * - ISO strings can include offset/zone annotations
 * - Plain local strings require `tz` option
 */
export type TimeInput = Temporal.Instant | Temporal.PlainDateTime | Temporal.ZonedDateTime | string;

/**
 * Time zone and disambiguation options for conversions.
 * - `tz`: Time zone ID (e.g., 'America/New_York'). Defaults to system timezone.
 *   Used to interpret plain-local inputs (Temporal.PlainDateTime and plain local strings)
 *   and to choose display/view zone in toZoned/format helpers.
 * - `when`: How to resolve ambiguous local times during DST transitions.
 *   Only applies when converting local wall-clock values to an instant.
 *   'earlier' | 'later' | 'compatible' (default) | 'reject'
 */
export interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

/**
 * Options for computing differences between times.
 * Extends TimeOptions and adds Temporal.Duration granularity control.
 */
export interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

/**
 * Common formatting patterns for human-readable output.
 * - 'short': Compact style (e.g., "21/03/2026, 10:15 AM")
 * - 'long': Expanded style (e.g., "Sunday, March 21, 2026 at 10:15:30 AM")
 * - 'date-only': Just the date (e.g., "21/03/2026")
 * - 'time-only': Just the time (e.g., "10:15 AM")
 */
export type FormatPattern = 'short' | 'long' | 'date-only' | 'time-only';

/**
 * Options for formatting times as human-readable strings.
 * - `pattern`: Preset format (covers 80% of common cases)
 * - `locale`: BCP 47 language tag for localization
 * - `tz`: Time zone for display (affects wall-clock time shown)
 * - `intl`: Escape hatch for advanced Intl.DateTimeFormatOptions (overrides pattern fields)
 */
export interface HumanFormatOptions {
  pattern?: FormatPattern;
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions;
}

type ParsedTimeInput =
  | { kind: 'instant'; value: Temporal.Instant }
  | { kind: 'local'; value: Temporal.PlainDateTime }
  | { kind: 'zoned'; value: Temporal.ZonedDateTime };

const DEFAULT_DISAMBIGUATION: DateTimeDisambiguation = 'compatible';
const ERROR_PREFIX = '[timit]';
const INVALID_TIME_STRING_MESSAGE =
  'Invalid time string. Expected ISO instant, zoned date/time, or plain local date/time.';
const MISSING_LOCAL_TIME_ZONE_MESSAGE = 'Local date/time input requires options.tz.';

function fail(message: string): never {
  throw new TypeError(`${ERROR_PREFIX} ${message}`);
}

function resolveTimeZone(tz?: string): string {
  return tz ?? Temporal.Now.timeZoneId();
}

function parsePlainDateTime(value: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(value);
  } catch {
    return Temporal.PlainDate.from(value).toPlainDateTime();
  }
}

function parseStringInput(input: string): ParsedTimeInput {
  try {
    return { kind: 'zoned', value: Temporal.ZonedDateTime.from(input) };
  } catch {
    // Continue to instant/local parsing.
  }

  try {
    return { kind: 'instant', value: Temporal.Instant.from(input) };
  } catch {
    try {
      return { kind: 'local', value: parsePlainDateTime(input) };
    } catch {
      fail(INVALID_TIME_STRING_MESSAGE);
    }
  }
}

function parseInput(input: TimeInput): ParsedTimeInput {
  if (input instanceof Temporal.Instant) {
    return { kind: 'instant', value: input };
  }

  if (input instanceof Temporal.ZonedDateTime) {
    return { kind: 'zoned', value: input };
  }

  if (input instanceof Temporal.PlainDateTime) {
    return { kind: 'local', value: input };
  }

  if (typeof input === 'string') {
    return parseStringInput(input);
  }

  fail('Unsupported time input type.');
}

function toJsDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

function resolveFormatPattern(pattern?: FormatPattern): Intl.DateTimeFormatOptions {
  if (!pattern) return { dateStyle: 'medium', timeStyle: 'short' };

  const patterns: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
    'date-only': { dateStyle: 'short' },
    long: { dateStyle: 'full', timeStyle: 'long' },
    short: { dateStyle: 'short', timeStyle: 'short' },
    'time-only': { timeStyle: 'short' },
  };

  return patterns[pattern];
}

function makeFormatter(options: HumanFormatOptions = {}): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(options.locale, {
    ...resolveFormatPattern(options.pattern),
    ...options.intl,
    timeZone: resolveTimeZone(options.tz),
  });
}

export function now(tz?: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(resolveTimeZone(tz));
}

export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  const parsed = parseInput(input);

  if (parsed.kind === 'instant') {
    return parsed.value;
  }

  if (parsed.kind === 'zoned') {
    return parsed.value.toInstant();
  }

  if (!options.tz) {
    fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);
  }

  return parsed.value
    .toZonedDateTime(options.tz, {
      disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
    })
    .toInstant();
}

export function toZoned(input: TimeInput, options: TimeOptions = {}): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = resolveTimeZone(options.tz);

  if (parsed.kind === 'zoned') {
    if (!options.tz) {
      return parsed.value;
    }

    return parsed.value.withTimeZone(tz);
  }

  if (parsed.kind === 'local') {
    if (!options.tz) {
      fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);
    }

    return parsed.value.toZonedDateTime(tz, {
      disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
    });
  }

  return parsed.value.toZonedDateTimeISO(tz);
}

export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  return toZoned(input, options).add(duration);
}

export function diff(start: TimeInput, end: TimeInput, options: DifferenceOptions = {}): Temporal.Duration {
  const { tz } = options;
  const startDateTime = toZoned(start, { tz, when: options.when });
  const endDateTime = toZoned(end, { tz, when: options.when });

  return endDateTime.since(startDateTime, {
    largestUnit: options.largestUnit,
    roundingIncrement: options.roundingIncrement,
    roundingMode: options.roundingMode,
    smallestUnit: options.smallestUnit,
  });
}

export function within(input: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): boolean {
  const value = toInstant(input, options).epochNanoseconds;
  const boundA = toInstant(start, options).epochNanoseconds;
  const boundB = toInstant(end, options).epochNanoseconds;
  const lower = boundA <= boundB ? boundA : boundB;
  const upper = boundA <= boundB ? boundB : boundA;

  return value >= lower && value <= upper;
}

export function formatHuman(input: TimeInput, options: HumanFormatOptions = {}): string {
  const instant = toInstant(input, { tz: options.tz });
  const formatter = makeFormatter(options);

  return formatter.format(toJsDate(instant));
}

export function formatISO(input: TimeInput, options: TimeOptions = {}): string {
  return toInstant(input, options).toString();
}

export function formatRange(start: TimeInput, end: TimeInput, options: HumanFormatOptions = {}): string {
  const formatter = makeFormatter(options);
  const startDate = toJsDate(toInstant(start, { tz: options.tz }));
  const endDate = toJsDate(toInstant(end, { tz: options.tz }));

  const formatterWithRange = formatter as Intl.DateTimeFormat & {
    formatRange?: (startDate: Date, endDate: Date) => string;
  };

  if (typeof formatterWithRange.formatRange === 'function') {
    return formatterWithRange.formatRange(startDate, endDate);
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

/**
 * Convenience namespace for date/time helpers.
 *
 * Importing `d` pulls in the full library. For bundle-size-sensitive code,
 * prefer named exports so bundlers can tree-shake unused helpers.
 */
export const d = {
  diff,
  formatHuman,
  formatISO,
  formatRange,
  now,
  shift,
  Temporal,
  toInstant,
  toZoned,
  within,
};
