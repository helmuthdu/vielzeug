import { Temporal } from '@js-temporal/polyfill';

export { Temporal };

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/**
 * Supported input types for date/time operations.
 * - Temporal types preserve timezone and disambiguation info
 * - Date is silently converted to Instant (timezone lost)
 * - Numbers are treated as epoch milliseconds
 * - ISO strings can have offset; plain strings require `tz` option
 */
export type TimeInput = Date | Temporal.Instant | Temporal.PlainDateTime | Temporal.ZonedDateTime | number | string;

/**
 * Time zone and disambiguation options for conversions.
 * - `tz`: Time zone ID (e.g., 'America/New_York'). Defaults to system timezone.
 * - `when`: How to resolve ambiguous local times during DST transitions.
 *   'earlier' | 'later' | 'compatible' (default) | 'reject'
 */
export interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

export interface LocalTimeOptions {
  tz: string;
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
 * - 'iso': Full ISO-8601 style (e.g., "Sunday, March 21, 2026, 10:15:30 AM")
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
 * - `intl`: Escape hatch for advanced Intl.DateTimeFormatOptions
 */
export interface HumanFormatOptions {
  pattern?: FormatPattern;
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions;
}

const DEFAULT_DISAMBIGUATION: DateTimeDisambiguation = 'compatible';

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

function isPlainLocalLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value);
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

export function parseLocal(input: string, options: LocalTimeOptions): Temporal.ZonedDateTime {
  return parsePlainDateTime(input).toZonedDateTime(options.tz, {
    disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
  });
}

export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  if (input instanceof Temporal.Instant) {
    return input;
  }

  if (input instanceof Temporal.ZonedDateTime) {
    return input.toInstant();
  }

  if (input instanceof Temporal.PlainDateTime) {
    if (!options.tz) {
      throw new TypeError('Temporal.PlainDateTime input requires options.tz.');
    }

    return input
      .toZonedDateTime(options.tz, {
        disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
      })
      .toInstant();
  }

  if (input instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(input.getTime());
  }

  if (typeof input === 'number') {
    return Temporal.Instant.fromEpochMilliseconds(input);
  }

  if (typeof input === 'string') {
    try {
      return Temporal.Instant.from(input);
    } catch {
      if (!isPlainLocalLike(input)) {
        throw new TypeError('Invalid time string. Expected ISO instant or plain local date/time.');
      }

      if (!options.tz) {
        throw new TypeError('Plain local date/time string requires options.tz.');
      }

      return parseLocal(input, {
        tz: options.tz,
        when: options.when,
      }).toInstant();
    }
  }

  throw new TypeError('Unsupported time input type.');
}

export function toZoned(input: TimeInput, options: TimeOptions = {}): Temporal.ZonedDateTime {
  if (input instanceof Temporal.ZonedDateTime) {
    if (!options.tz) {
      return input;
    }

    const tz = resolveTimeZone(options.tz);

    return input.withTimeZone(tz);
  }

  const tz = resolveTimeZone(options.tz);

  if (input instanceof Temporal.PlainDateTime) {
    if (!options.tz) {
      throw new TypeError('Temporal.PlainDateTime input requires options.tz.');
    }

    return input.toZonedDateTime(tz, {
      disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
    });
  }

  return toInstant(input, options).toZonedDateTimeISO(tz);
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
 * Namespace object for date/time operations.
 * Provides a grouped API with explicit parsing and formatting modes.
 *
 * @example
 * ```ts
 * import { t } from '@vielzeug/timit';
 *
 * t.now('UTC')
 * t.toInstant('2026-03-21T10:15:30Z')
 * t.toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' })
 * t.parseLocal('2026-03-21T10:15:30', { tz: 'Europe/Berlin' })
 * t.shift(time, { hours: 1 })
 * t.diff(start, end)
 * t.within(time, start, end)
 * t.formatHuman(time, { pattern: 'short' })
 * t.formatISO(time)
 * t.formatRange(start, end)
 * ```
 */
export const t = {
  diff,
  formatHuman,
  formatISO,
  formatRange,
  now,
  parseLocal,
  shift,
  toInstant,
  toZoned,
  within,
} as const;
