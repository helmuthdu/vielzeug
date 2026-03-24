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
export type FormatPattern = 'iso' | 'short' | 'long' | 'date-only' | 'time-only';

/**
 * Options for formatting times as human-readable strings.
 * - `pattern`: Preset format (covers 80% of common cases)
 * - `locale`: BCP 47 language tag for localization
 * - `tz`: Time zone for display (affects wall-clock time shown)
 * - `intl`: Escape hatch for advanced Intl.DateTimeFormatOptions
 */
export interface FormatOptions {
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

function resolveFormatPattern(pattern?: FormatPattern): Intl.DateTimeFormatOptions {
  if (!pattern) return { dateStyle: 'medium', timeStyle: 'short' };

  const patterns: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
    'date-only': { dateStyle: 'short' },
    iso: { dateStyle: 'full', timeStyle: 'long' },
    long: { dateStyle: 'full', timeStyle: 'long' },
    short: { dateStyle: 'short', timeStyle: 'short' },
    'time-only': { timeStyle: 'short' },
  };

  return patterns[pattern];
}

export function now(tz?: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(resolveTimeZone(tz));
}

export function asInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  if (input instanceof Temporal.Instant) {
    return input;
  }

  if (input instanceof Temporal.ZonedDateTime) {
    return input.toInstant();
  }

  if (input instanceof Temporal.PlainDateTime) {
    const tz = resolveTimeZone(options.tz);

    return input
      .toZonedDateTime(tz, {
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
      if (!options.tz) {
        throw new TypeError('String inputs without offset require a tz option.');
      }

      return parsePlainDateTime(input)
        .toZonedDateTime(options.tz, {
          disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
        })
        .toInstant();
    }
  }

  throw new TypeError('Unsupported time input type.');
}

export function asZoned(input: TimeInput, options: TimeOptions = {}): Temporal.ZonedDateTime {
  if (input instanceof Temporal.ZonedDateTime) {
    if (!options.tz) {
      return input;
    }

    const tz = resolveTimeZone(options.tz);

    return input.withTimeZone(tz);
  }

  const tz = resolveTimeZone(options.tz);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(tz, {
      disambiguation: options.when ?? DEFAULT_DISAMBIGUATION,
    });
  }

  return asInstant(input, options).toZonedDateTimeISO(tz);
}

export function add(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  return asZoned(input, options).add(duration);
}

export function subtract(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  return asZoned(input, options).subtract(duration);
}

export function diff(start: TimeInput, end: TimeInput, options: DifferenceOptions = {}): Temporal.Duration {
  const { tz } = options;
  const startDateTime = asZoned(start, { tz, when: options.when });
  const endDateTime = asZoned(end, { tz, when: options.when });

  return endDateTime.since(startDateTime, {
    largestUnit: options.largestUnit,
    roundingIncrement: options.roundingIncrement,
    roundingMode: options.roundingMode,
    smallestUnit: options.smallestUnit,
  });
}

export function within(input: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): boolean {
  const value = asInstant(input, options).epochNanoseconds;
  const lower = asInstant(start, options).epochNanoseconds;
  const upper = asInstant(end, options).epochNanoseconds;

  return value >= lower && value <= upper;
}

export function format(input: TimeInput, options: FormatOptions = {}): string {
  const instant = asInstant(input, { tz: options.tz });
  const intlOptions = resolveFormatPattern(options.pattern);
  const formatter = new Intl.DateTimeFormat(options.locale, {
    ...intlOptions,
    ...options.intl,
    timeZone: resolveTimeZone(options.tz),
  });

  return formatter.format(new Date(instant.epochMilliseconds));
}

export function formatRange(start: TimeInput, end: TimeInput, options: FormatOptions = {}): string {
  const intlOptions = resolveFormatPattern(options.pattern);
  const formatter = new Intl.DateTimeFormat(options.locale, {
    ...intlOptions,
    ...options.intl,
    timeZone: resolveTimeZone(options.tz),
  });
  const startDate = new Date(asInstant(start, { tz: options.tz }).epochMilliseconds);
  const endDate = new Date(asInstant(end, { tz: options.tz }).epochMilliseconds);

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
 * Provides a grouped API similar to Validit's "v" pattern.
 *
 * @example
 * ```ts
 * import { d } from '@vielzeug/timit';
 *
 * d.now('UTC')
 * d.asInstant(input, { tz: 'Europe/Berlin' })
 * d.asZoned(instant)
 * d.add(time, { hours: 1 })
 * d.subtract(time, { minutes: 30 })
 * d.diff(start, end)
 * d.within(time, start, end)
 * d.format(time, { pattern: 'short' })
 * d.formatRange(start, end)
 * ```
 */
export const d = {
  add,
  asInstant,
  asZoned,
  diff,
  format,
  formatRange,
  now,
  subtract,
  within,
} as const;
