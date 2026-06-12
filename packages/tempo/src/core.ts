import { Temporal } from '@js-temporal/polyfill';

import type { DifferenceOptions, TimeInput, TimeOptions, TimeOptionsWithTz } from './types';

import { CALENDAR_UNITS, fail, inferSharedTimeZone, inferTimeZone, toInstant, toZoned } from './internal';

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
 * Returns the current absolute instant (UTC point in time).
 * Use this instead of `Temporal.Now.instant()` to avoid importing Temporal directly.
 *
 * @example
 * ```ts
 * timeDiff(nowInstant()) // { unit: 'millisecond', value: 0 } (compared to now)
 * expires(nowInstant(), { expired: { days: 0 }, safe: { years: 100 } }) // 'safe'
 * ```
 */
export function nowInstant(): Temporal.Instant {
  return Temporal.Now.instant();
}

/**
 * Parses a full ISO 8601 zoned date-time string into a `ZonedDateTime`.
 * Use this instead of `Temporal.ZonedDateTime.from()` to avoid importing Temporal directly.
 *
 * @example
 * ```ts
 * parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]')
 * parseZoned('2026-03-21T00:00:00[UTC]')
 * ```
 */
export function parseZoned(input: string): Temporal.ZonedDateTime {
  try {
    return Temporal.ZonedDateTime.from(input);
  } catch {
    fail(
      `Invalid zoned date-time string: "${input}". Expected an ISO 8601 string with offset and timezone (e.g. 2026-03-21T10:00:00+01:00[Europe/Berlin]).`,
    );
  }
}

/**
 * Parses an ISO 8601 date-only string into a timezone-free `PlainDate`.
 * Use this instead of `Temporal.PlainDate.from()` to avoid importing Temporal directly.
 *
 * @example
 * ```ts
 * parsePlainDate('2026-03-21') // 2026-03-21
 * ```
 */
export function parsePlainDate(input: string): Temporal.PlainDate {
  try {
    return Temporal.PlainDate.from(input);
  } catch {
    fail(`Invalid plain date string: "${input}". Expected an ISO 8601 date string (e.g. YYYY-MM-DD).`);
  }
}

/**
 * Parses an ISO 8601 string into a timezone-free `PlainDateTime` (wall-clock time).
 * Use {@link toInstant} or {@link toZoned} to attach a timezone when needed.
 *
 * @example
 * ```ts
 * parsePlainDateTime('2026-03-21')             // 2026-03-21T00:00:00
 * parsePlainDateTime('2026-03-21T10:15:30')    // 2026-03-21T10:15:30
 * ```
 */
export function parsePlainDateTime(input: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(input);
  } catch {
    fail(
      `Invalid date/time string: "${input}". Expected an ISO 8601 date or date-time string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).`,
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
 * DST-safe date arithmetic. Adds `duration` to `input` and returns the result as a
 * `ZonedDateTime`. Handles spring-forward and fall-back correctly.
 *
 * **Always returns a `ZonedDateTime`** — even when the input is an `Instant`.
 * Call `.toInstant()` on the result if you need an `Instant` back.
 * Requires `options.tz` when input is an `Instant`, `PlainDate`, or `PlainDateTime`.
 *
 * @example
 * ```ts
 * shift(parseZoned('2026-03-08T01:30:00-05:00[America/New_York]'), { hours: 1 })
 * // 2026-03-08T03:30:00-04:00[America/New_York]  (skipped the missing hour)
 *
 * // Instant input — tz required, result is ZonedDateTime
 * shift(parseInstant('2026-03-21T10:00:00Z'), { hours: 2 }, { tz: 'UTC' }).toInstant()
 * ```
 */
export function shift(
  input: Temporal.ZonedDateTime,
  duration: Temporal.DurationLike,
  options?: TimeOptions,
): Temporal.ZonedDateTime;
export function shift(
  input: Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime,
  duration: Temporal.DurationLike,
  options: TimeOptionsWithTz,
): Temporal.ZonedDateTime;
export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);

  return toZoned(input, { prefer: options.prefer, tz }).add(duration);
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
 *   parseZoned('2026-03-08T00:00:00-05:00[America/New_York]'),
 *   parseZoned('2026-03-09T00:00:00-04:00[America/New_York]'),
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

  return toZoned(end, { prefer: options.prefer, tz }).since(
    toZoned(start, { prefer: options.prefer, tz }),
    roundingOptions,
  );
}

/**
 * Parses any ISO 8601 date/time string into the most specific `TimeInput` type possible.
 * Tries ZonedDateTime → Instant → PlainDateTime → PlainDate in order.
 * Throws a descriptive `TypeError` if none match.
 *
 * @example
 * ```ts
 * parseDate('2026-03-21T11:00:00+01:00[Europe/Berlin]') // ZonedDateTime
 * parseDate('2026-03-21T10:00:00Z')                     // Instant
 * parseDate('2026-03-21T10:00:00')                      // PlainDateTime
 * parseDate('2026-03-21')                               // PlainDate
 * ```
 */
export function parseDate(input: string): TimeInput {
  try {
    return Temporal.ZonedDateTime.from(input);
  } catch {
    /* try next format */
  }

  try {
    return Temporal.Instant.from(input);
  } catch {
    /* try next format */
  }

  // Try PlainDateTime before PlainDate — a date-only string (no 'T') will also
  // be accepted by PlainDateTime.from(), producing midnight, so we check the
  // string to pick the most specific type.
  if (input.includes('T')) {
    try {
      return Temporal.PlainDateTime.from(input);
    } catch {
      /* fall through to error */
    }
  } else {
    try {
      return Temporal.PlainDate.from(input);
    } catch {
      /* fall through to error */
    }
  }

  fail(
    `Unable to parse date/time string: "${input}". Expected ISO 8601 ZonedDateTime, Instant, PlainDateTime, or PlainDate.`,
  );
}

/**
 * Type guard that checks whether `value` is a valid `TimeInput`.
 *
 * @example
 * ```ts
 * isValid(parseInstant('2026-03-21T10:00:00Z')) // true
 * isValid('2026-03-21')                         // false
 * ```
 */
export function isValid(value: unknown): value is TimeInput {
  return (
    value instanceof Temporal.Instant ||
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.PlainDateTime ||
    value instanceof Temporal.PlainDate
  );
}
