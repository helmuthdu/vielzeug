import { Temporal } from '@js-temporal/polyfill';

import type { TimeDiffResult, TimeDiffUnit, TimeInput, TimeOptions } from './types';

import { inferSharedTimeZone, MS_PER_MONTH, toInstant, toZoned } from './internal';

// ─── Threshold sort cache ─────────────────────────────────────────────────────

type SortedThreshold<K extends string> = { key: K; ms: number }[];

const THRESHOLD_SORT_CACHE = new WeakMap<object, SortedThreshold<string>>();

function getSortedThresholds<K extends string>(thresholds: Record<K, Temporal.DurationLike>): SortedThreshold<K> {
  const cached = THRESHOLD_SORT_CACHE.get(thresholds);

  if (cached) return cached as SortedThreshold<K>;

  const sorted = (Object.keys(thresholds) as K[])
    .map((key) => ({ key, ms: durationToMs(thresholds[key]) }))
    .sort((a, b) => a.ms - b.ms);

  THRESHOLD_SORT_CACHE.set(thresholds, sorted);

  return sorted;
}

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
  now = Temporal.Now.instant(),
): K | null {
  const dateMs = toInstant(date, options).epochMilliseconds;
  const nowMs = now.epochMilliseconds;

  // diff is positive for future dates, negative for past dates (date − now)
  const diffMs = dateMs - nowMs;

  for (const { key, ms } of getSortedThresholds(thresholds)) {
    if (diffMs <= ms) return key;
  }

  return null;
}

/** Converts a `DurationLike` to approximate milliseconds for threshold comparison. */
function durationToMs(duration: Temporal.DurationLike): number {
  const d = Temporal.Duration.from(duration);

  // Use approximate conversions — thresholds are human-defined boundaries, not calendar-precise.
  return (
    (d.years ?? 0) * 12 * MS_PER_MONTH +
    (d.months ?? 0) * MS_PER_MONTH +
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

  // Fast path: when both inputs are Instant, use millisecond arithmetic treating 1 day = 86400 s.
  // Temporal.Instant.since() supports largestUnit up to 'hour' only (no calendar units),
  // so we compute day/week/month/year manually from the millisecond delta.
  if (a instanceof Temporal.Instant && end instanceof Temporal.Instant) {
    const diffMs = Math.abs(end.epochMilliseconds - a.epochMilliseconds);

    return instantDiff(diffMs);
  }

  const tz = inferSharedTimeZone([a, end], options);
  const zonedA = toZoned(a, { prefer: options.prefer, tz });
  const zonedB = toZoned(end, { prefer: options.prefer, tz });

  const duration =
    Temporal.ZonedDateTime.compare(zonedA, zonedB) <= 0
      ? zonedB.since(zonedA, { largestUnit: 'year' })
      : zonedA.since(zonedB, { largestUnit: 'year' });

  return pickLargestUnit(duration);
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
  const now = Temporal.Now.instant();

  return {
    diff: timeDiff(date, now, options),
    key: expires(date, thresholds, options, now),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Computes a `TimeDiffResult` from an absolute millisecond delta, treating
 * 1 day = 86400 s and using the same month approximation as `durationToMs`.
 */
function instantDiff(diffMs: number): TimeDiffResult {
  const MS_PER_YEAR = 12 * MS_PER_MONTH;

  if (diffMs === 0) return { unit: 'millisecond', value: 0 };

  const years = Math.floor(diffMs / MS_PER_YEAR);

  if (years > 0) return { unit: 'year', value: years };

  const months = Math.floor(diffMs / MS_PER_MONTH);

  if (months > 0) return { unit: 'month', value: months };

  const days = Math.floor(diffMs / 86_400_000);

  if (days > 0) return { unit: 'day', value: days };

  const hours = Math.floor(diffMs / 3_600_000);

  if (hours > 0) return { unit: 'hour', value: hours };

  const minutes = Math.floor(diffMs / 60_000);

  if (minutes > 0) return { unit: 'minute', value: minutes };

  const seconds = Math.floor(diffMs / 1_000);

  if (seconds > 0) return { unit: 'second', value: seconds };

  return { unit: 'millisecond', value: diffMs };
}

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

/**
 * Converts a `TimeDiffResult` to a human-readable string.
 * Uses the singular unit name when value is 1, plural (unit + 's') otherwise.
 *
 * Pass `options.locale` to localize the numeric part via `Intl.NumberFormat`.
 * Unit names remain English — for fully localized output use {@link formatRelative}
 * or {@link formatDuration} instead.
 *
 * @example
 * ```ts
 * humanize({ unit: 'day', value: 1 })  // '1 day'
 * humanize({ unit: 'day', value: 3 })  // '3 days'
 * humanize({ unit: 'day', value: 3 }, { locale: 'ar' }) // '٣ days'
 * humanize({ unit: 'millisecond', value: 0 }) // '0 milliseconds'
 * ```
 */
export function humanize(diff: TimeDiffResult, options: { locale?: Intl.LocalesArgument } = {}): string {
  const { unit, value } = diff;
  const formatted = options.locale ? new Intl.NumberFormat(options.locale).format(value) : String(value);

  return `${formatted} ${value === 1 ? unit : `${unit}s`}`;
}
