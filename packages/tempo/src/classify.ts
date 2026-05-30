import { Temporal } from '@js-temporal/polyfill';

import type { TimeDiffResult, TimeDiffUnit, TimeInput, TimeOptions } from './types';

import { inferSharedTimeZone, resolveInstant, resolveZoned } from './internal';

// ─── expires ─────────────────────────────────────────────────────────────────

/**
 * Classifies a date into a user-defined bucket by comparing diff = date − now
 * against the provided thresholds (sorted ascending). Returns the key of the
 * first threshold the diff falls within, or `null` if no threshold matches.
 *
 * Thresholds accept negative durations to classify past dates. The function
 * requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * expires(expiresAt, {
 *   longExpired: { days: -30 },  // more than 30 days in the past
 *   expired:     { days: 0 },    // any past date
 *   critical:    { days: 3 },    // within 3 days
 *   warning:     { days: 14 },   // within 14 days
 *   safe:        { years: 100 }, // catch-all for far future
 * })
 * // → 'longExpired' | 'expired' | 'critical' | 'warning' | 'safe' | null
 * ```
 */
export function expires<K extends string>(
  date: TimeInput,
  thresholds: Record<K, Temporal.DurationLike>,
  options: TimeOptions = {},
): K | null {
  const dateMs = resolveInstant(date, options).epochMilliseconds;
  const nowMs = Temporal.Now.instant().epochMilliseconds;

  // diff is positive for future dates, negative for past dates (date − now)
  const diffMs = dateMs - nowMs;

  // Pre-compute ms values and sort once, smallest (most negative) first.
  const sorted = (Object.keys(thresholds) as K[])
    .map((key) => ({ key, ms: durationToMs(thresholds[key]) }))
    .sort((a, b) => a.ms - b.ms);

  for (const { key, ms } of sorted) {
    if (diffMs <= ms) return key;
  }

  return null;
}

/** Converts a `DurationLike` to approximate milliseconds for threshold comparison. */
function durationToMs(duration: Temporal.DurationLike): number {
  const d = Temporal.Duration.from(duration);

  // Use approximate conversions — thresholds are human-defined boundaries, not calendar-precise.
  return (
    (d.years ?? 0) * 365.25 * 86_400_000 +
    (d.months ?? 0) * 30.44 * 86_400_000 +
    (d.weeks ?? 0) * 7 * 86_400_000 +
    (d.days ?? 0) * 86_400_000 +
    (d.hours ?? 0) * 3_600_000 +
    (d.minutes ?? 0) * 60_000 +
    (d.seconds ?? 0) * 1_000 +
    (d.milliseconds ?? 0) +
    (d.microseconds ?? 0) / 1_000 +
    (d.nanoseconds ?? 0) / 1_000_000
  );
}

// ─── timeDiff ─────────────────────────────────────────────────────────────────

/**
 * Returns the absolute calendar-accurate difference between two dates as a
 * structured `{ unit, value }` in the largest meaningful unit.
 *
 * When `b` is omitted, the current instant is used. For two raw `Instant` inputs
 * with no timezone, uses millisecond arithmetic treating a day as exactly 86400 s.
 * Requires `options.tz` when inputs are `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * timeDiff(
 *   parseInstant('2026-01-01T00:00:00Z'),
 *   parseInstant('2027-03-15T00:00:00Z'),
 * )
 * // { unit: 'year', value: 1 }
 * ```
 */
export function timeDiff(a: TimeInput, b?: TimeInput, options: TimeOptions = {}): TimeDiffResult {
  const end: TimeInput = b ?? Temporal.Now.instant();

  // Use the calendar-aware path when either input is non-Instant or a tz is provided.
  const hasCalendarInput = !(a instanceof Temporal.Instant) || !(end instanceof Temporal.Instant);
  const tz = hasCalendarInput || options.tz ? inferSharedTimeZone([a, end], options) : undefined;

  if (tz) {
    const zonedA = resolveZoned(a, { prefer: options.prefer, tz });
    const zonedB = resolveZoned(end, { prefer: options.prefer, tz });

    const duration =
      Temporal.ZonedDateTime.compare(zonedA, zonedB) <= 0
        ? zonedB.since(zonedA, { largestUnit: 'year' })
        : zonedA.since(zonedB, { largestUnit: 'year' });

    return pickLargestUnit(duration);
  }

  // Fast path: both are Instants, no calendar context — treat day as exactly 86400 s.
  return instantDiff(a as Temporal.Instant, end as Temporal.Instant);
}

function instantDiff(a: Temporal.Instant, b: Temporal.Instant): TimeDiffResult {
  const diffMs = Math.abs(a.epochMilliseconds - b.epochMilliseconds);
  const days = Math.floor(diffMs / 86_400_000);

  if (days >= 1) return { unit: 'day', value: days };

  const hours = Math.floor(diffMs / 3_600_000);

  if (hours >= 1) return { unit: 'hour', value: hours };

  const minutes = Math.floor(diffMs / 60_000);

  if (minutes >= 1) return { unit: 'minute', value: minutes };

  const seconds = Math.floor(diffMs / 1_000);

  if (seconds >= 1) return { unit: 'second', value: seconds };

  return { unit: 'millisecond', value: diffMs };
}

// ─── classify ─────────────────────────────────────────────────────────────────

/**
 * Unified helper combining {@link expires} and {@link timeDiff} in a single call.
 * Returns both the matching threshold key and the structured time difference,
 * enabling bucket classification and display formatting together.
 *
 * @example
 * ```ts
 * const { key, diff } = classify(expiresAt, {
 *   expired: { days: 0 },
 *   critical: { days: 3 },
 *   warning: { days: 14 },
 *   safe: { years: 100 },
 * });
 * // key: 'critical', diff: { unit: 'hour', value: 47 }
 * ```
 */
export function classify<K extends string>(
  date: TimeInput,
  thresholds: Record<K, Temporal.DurationLike>,
  options: TimeOptions = {},
): { diff: TimeDiffResult; key: K | null } {
  return {
    diff: timeDiff(date, undefined, options),
    key: expires(date, thresholds, options),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const UNIT_ORDER: ReadonlyArray<{ field: keyof Temporal.Duration; unit: TimeDiffUnit }> = [
  { field: 'years', unit: 'year' },
  { field: 'months', unit: 'month' },
  { field: 'weeks', unit: 'week' },
  { field: 'days', unit: 'day' },
  { field: 'hours', unit: 'hour' },
  { field: 'minutes', unit: 'minute' },
  { field: 'seconds', unit: 'second' },
  { field: 'milliseconds', unit: 'millisecond' },
];

function pickLargestUnit(duration: Temporal.Duration): TimeDiffResult {
  for (const { field, unit } of UNIT_ORDER) {
    const value = Math.abs(duration[field] as number);

    if (value > 0) return { unit, value };
  }

  return { unit: 'millisecond', value: 0 };
}
