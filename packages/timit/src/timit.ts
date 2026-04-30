import { Temporal } from '@js-temporal/polyfill';

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/**
 * Supported input types for date/time operations.
 * - Temporal types preserve timezone and disambiguation info
 * - ISO strings can include offset/zone annotations
 * - Plain local values (Temporal.PlainDate, Temporal.PlainDateTime, and plain local strings) require `tz` option
 */
export type TimeInput =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | string;

type LocalTemporalInput = Temporal.PlainDate | Temporal.PlainDateTime;
type AbsoluteTemporalInput = Temporal.Instant | Temporal.ZonedDateTime;

/**
 * Time zone and disambiguation options for conversions.
 * - `tz`: Time zone ID (e.g., 'America/New_York'). Defaults to system timezone.
 *   Used to interpret plain-local inputs (Temporal.PlainDate, Temporal.PlainDateTime, and plain local strings)
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
 * - 'medium': Default balanced style (e.g., "Mar 21, 2026, 10:15 AM")
 * - 'long': Expanded style (e.g., "Sunday, March 21, 2026 at 10:15:30 AM")
 * - 'date-only': Just the date (e.g., "21/03/2026")
 * - 'time-only': Just the time (e.g., "10:15 AM")
 */
export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

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

export type TimeOptionsWithTz = TimeOptions & { tz: string };

type ParsedTimeInput =
  | { kind: 'instant'; value: Temporal.Instant }
  | { kind: 'local'; value: Temporal.PlainDateTime }
  | { kind: 'zoned'; value: Temporal.ZonedDateTime };

const ERROR_PREFIX = '[timit]';
const INVALID_TIME_STRING_MESSAGE =
  'Invalid time string. Expected ISO instant, zoned date/time, or plain local date/time.';
const MISSING_LOCAL_TIME_ZONE_MESSAGE = 'Local date/time input requires options.tz.';
const UNSUPPORTED_TIME_INPUT_MESSAGE = 'Unsupported time input type.';
const FORMAT_PRESETS: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
  'date-only': { dateStyle: 'short' },
  long: { dateStyle: 'full', timeStyle: 'long' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  short: { dateStyle: 'short', timeStyle: 'short' },
  'time-only': { timeStyle: 'short' },
};

function fail(message: string): never {
  throw new TypeError(`${ERROR_PREFIX} ${message}`);
}

function resolveTimeZone(tz?: string): string {
  return tz ?? Temporal.Now.timeZoneId();
}

function parseStringInput(input: string): ParsedTimeInput {
  try {
    return { kind: 'zoned', value: Temporal.ZonedDateTime.from(input) };
  } catch {
    /* try next */
  }

  try {
    return { kind: 'instant', value: Temporal.Instant.from(input) };
  } catch {
    /* try next */
  }

  try {
    return { kind: 'local', value: Temporal.PlainDateTime.from(input) };
  } catch {
    /* try next */
  }

  fail(INVALID_TIME_STRING_MESSAGE);
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

  if (input instanceof Temporal.PlainDate) {
    return { kind: 'local', value: input.toPlainDateTime() };
  }

  if (typeof input === 'string') {
    return parseStringInput(input);
  }

  fail(UNSUPPORTED_TIME_INPUT_MESSAGE);
}

function makeFormatter(options: HumanFormatOptions = {}): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(options.locale, {
    ...FORMAT_PRESETS[options.pattern ?? 'medium'],
    ...options.intl,
    timeZone: resolveTimeZone(options.tz),
  });
}

function now(tz?: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(resolveTimeZone(tz));
}

function toInstantFromParsed(parsed: ParsedTimeInput, options: TimeOptions): Temporal.Instant {
  if (parsed.kind === 'instant') {
    return parsed.value;
  }

  if (parsed.kind === 'zoned') {
    return parsed.value.toInstant();
  }

  if (!options.tz) {
    fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);
  }

  return parsed.value.toZonedDateTime(options.tz, { disambiguation: options.when }).toInstant();
}

function toZonedFromParsed(parsed: ParsedTimeInput, options: TimeOptions): Temporal.ZonedDateTime {
  const tz = resolveTimeZone(options.tz);

  if (parsed.kind === 'zoned') {
    return options.tz ? parsed.value.withTimeZone(tz) : parsed.value;
  }

  if (parsed.kind === 'local') {
    if (!options.tz) {
      fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);
    }

    return parsed.value.toZonedDateTime(tz, { disambiguation: options.when });
  }

  return parsed.value.toZonedDateTimeISO(tz);
}

function toInstant(input: LocalTemporalInput, options: TimeOptionsWithTz): Temporal.Instant;
function toInstant(input: AbsoluteTemporalInput | string, options?: TimeOptions): Temporal.Instant;
function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return toInstantFromParsed(parseInput(input), options);
}

function toZoned(input: LocalTemporalInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime;
function toZoned(input: AbsoluteTemporalInput | string, options?: TimeOptions): Temporal.ZonedDateTime;
function toZoned(input: TimeInput, options: TimeOptions = {}): Temporal.ZonedDateTime {
  return toZonedFromParsed(parseInput(input), options);
}
function add(input: TimeInput, duration: Temporal.DurationLike, options: TimeOptions = {}): Temporal.ZonedDateTime {
  // For absolute inputs (instants), omission of options.tz uses the system timezone as the view context.
  return toZonedFromParsed(parseInput(input), options).add(duration);
}

function difference(start: TimeInput, end: TimeInput, options: DifferenceOptions = {}): Temporal.Duration {
  const { tz, when, ...sinceOptions } = options;
  const startDateTime = toZonedFromParsed(parseInput(start), { tz, when });
  const endDateTime = toZonedFromParsed(parseInput(end), { tz, when });

  return endDateTime.since(startDateTime, sinceOptions);
}

function within(input: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): boolean {
  const value = toInstantFromParsed(parseInput(input), options);
  let lower = toInstantFromParsed(parseInput(start), options);
  let upper = toInstantFromParsed(parseInput(end), options);

  if (Temporal.Instant.compare(lower, upper) > 0) {
    [lower, upper] = [upper, lower];
  }

  return Temporal.Instant.compare(lower, value) <= 0 && Temporal.Instant.compare(value, upper) <= 0;
}

function parse(input: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(input);
}

function format(input: TimeInput, options: HumanFormatOptions = {}): string {
  const instant = toInstantFromParsed(parseInput(input), { tz: options.tz });

  return makeFormatter(options).format(new Date(instant.epochMilliseconds));
}

function formatIso(input: TimeInput, options: TimeOptions = {}): string {
  return toInstantFromParsed(parseInput(input), options).toString();
}

function formatRange(start: TimeInput, end: TimeInput, options: HumanFormatOptions = {}): string {
  const formatter = makeFormatter(options);
  const startDate = new Date(toInstantFromParsed(parseInput(start), { tz: options.tz }).epochMilliseconds);
  const endDate = new Date(toInstantFromParsed(parseInput(end), { tz: options.tz }).epochMilliseconds);

  return formatter.formatRange(startDate, endDate);
}

export const timit = {
  add,
  difference,
  format,
  formatIso,
  formatRange,
  now,
  parse,
  toInstant,
  toZoned,
  within,
};
