import { Temporal } from '@js-temporal/polyfill';

import type { DifferenceOptions, TimeInput, TimeOptions, TimeOptionsWithTz } from './types';

import { CALENDAR_UNITS, fail, inferSharedTimeZone, inferTimeZone, resolveInstant, resolveZoned } from './internal';

/**
 * Returns the current date and time in the given timezone.
 *
 * @example
 * ```ts
 * now('America/New_York').hour; // current hour in New York
 * ```
 */
export function now(tz: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(tz);
}

/**
 * Parses an ISO 8601 string into a timezone-free `PlainDateTime` (wall-clock time).
 * Use {@link toInstant} or {@link toZoned} to attach a timezone when needed.
 *
 * @example
 * ```ts
 * parseLocal('2026-03-21')             // 2026-03-21T00:00:00
 * parseLocal('2026-03-21T10:15:30')    // 2026-03-21T10:15:30
 * ```
 */
export function parseLocal(input: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(input);
  } catch {
    fail(
      `Invalid local date/time string: "${input}". Expected an ISO 8601 date or date-time string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).`,
    );
  }
}

/**
 * Parses an ISO 8601 UTC string into an absolute `Instant`.
 *
 * @example
 * ```ts
 * parseInstant('2026-03-21T10:15:30Z')
 * ```
 */
export function parseInstant(input: string): Temporal.Instant {
  try {
    return Temporal.Instant.from(input);
  } catch {
    fail(`Invalid instant string: "${input}". Expected an ISO 8601 UTC string (e.g. YYYY-MM-DDTHH:mm:ssZ).`);
  }
}

/**
 * Converts any {@link TimeInput} to an absolute `Instant`.
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * toInstant(parseLocal('2026-03-21T11:00:00'), { tz: 'Europe/Berlin' })
 * ```
 */
export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return resolveInstant(input, options);
}

/**
 * Projects any {@link TimeInput} into a specific timezone as a `ZonedDateTime`.
 *
 * @example
 * ```ts
 * toZoned(parseInstant('2026-03-21T10:00:00Z'), { tz: 'Europe/Berlin' })
 * // 2026-03-21T11:00:00+01:00[Europe/Berlin]
 * ```
 */
export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  return resolveZoned(input, options);
}

/**
 * DST-safe date arithmetic. Adds `duration` to `input` and returns the result as a
 * `ZonedDateTime`. Handles spring-forward and fall-back correctly.
 *
 * @example
 * ```ts
 * shift(Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]'), { hours: 1 })
 * // 2026-03-08T03:30:00-04:00[America/New_York]  (skipped the missing hour)
 * ```
 */
export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);

  return resolveZoned(input, { prefer: options.prefer, tz }).add(duration);
}

/**
 * Returns the calendar-aware duration between `start` and `end`.
 *
 * When both inputs are `Instant` and no calendar unit is requested, the fast
 * path skips timezone conversion. Calendar units (`day`, `week`, `month`, `year`)
 * always require a timezone — pass `options.tz` or use `ZonedDateTime` inputs.
 *
 * @example
 * ```ts
 * difference(
 *   Temporal.ZonedDateTime.from('2026-03-08T00:00:00-05:00[America/New_York]'),
 *   Temporal.ZonedDateTime.from('2026-03-09T00:00:00-04:00[America/New_York]'),
 *   { largestUnit: 'hour' },
 * ).hours // 23  (DST spring-forward day)
 * ```
 */
export function difference(start: TimeInput, end: TimeInput, options: DifferenceOptions = {}): Temporal.Duration {
  const { largestUnit, roundingIncrement, roundingMode, smallestUnit } = options;
  const roundingOptions = { largestUnit, roundingIncrement, roundingMode, smallestUnit };

  const needsCalendar =
    (largestUnit !== undefined && CALENDAR_UNITS.has(largestUnit)) ||
    (smallestUnit !== undefined && CALENDAR_UNITS.has(smallestUnit));

  if (!needsCalendar && start instanceof Temporal.Instant && end instanceof Temporal.Instant) {
    return end.since(start, roundingOptions as Temporal.DifferenceOptions<Temporal.TimeUnit>);
  }

  const tz = inferSharedTimeZone([start, end], options);

  return resolveZoned(end, { prefer: options.prefer, tz }).since(
    resolveZoned(start, { prefer: options.prefer, tz }),
    roundingOptions,
  );
}
