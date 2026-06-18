import { Temporal } from '@js-temporal/polyfill';

import type { TimeDiffResult, TimeDiffUnit, TimeInput, TimeOptions } from './types';

import { toInstant, toZoned } from './_convert';
import { inferSharedTimeZone, MS_PER_MONTH } from './_tz';

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
 * **Performance:** threshold objects are cached by reference in a `WeakMap`. Define
 * the threshold record at module scope (not inline) so sorting is performed only once
 * per unique object.
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

function sinceZoned(a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime): Temporal.Duration {
  return Temporal.ZonedDateTime.compare(a, b) <= 0
    ? b.since(a, { largestUnit: 'year' })
    : a.since(b, { largestUnit: 'year' });
}

function pickLargestUnit(duration: Temporal.Duration): TimeDiffResult {
  for (const { field, unit } of UNIT_ORDER) {
    const value = Math.abs(duration[field] as number);

    if (value > 0) return { unit, value };
  }

  return { unit: 'millisecond', value: 0 };
}

/**
 * Returns the absolute calendar-accurate difference between two dates as a
 * structured `{ unit, value }` in the largest meaningful unit.
 *
 * When `b` is omitted, the current instant is used.
 * Requires `options.tz` when inputs are `PlainDate`, `PlainDateTime`, or plain `Instant` with
 * calendar-unit precision. Throws when timezone cannot be inferred from inputs.
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

  // Fast path: two Instants with no explicit tz — project to UTC for calendar-accurate units.
  // Instants are absolute and timezone-independent; UTC is the canonical calendar context.
  if (!options.tz && a instanceof Temporal.Instant && end instanceof Temporal.Instant) {
    return pickLargestUnit(sinceZoned(a.toZonedDateTimeISO('UTC'), end.toZonedDateTimeISO('UTC')));
  }

  // Plain inputs or calendar-accurate comparison require a timezone.
  const tz = inferSharedTimeZone([a, end], options);

  return pickLargestUnit(sinceZoned(toZoned(a, { tz }), toZoned(end, { tz })));
}
