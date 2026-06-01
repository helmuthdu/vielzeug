import { Temporal } from '@js-temporal/polyfill';

import type { RecurrenceRule, TimeInput, TimeOptions } from './types';

import { inferTimeZone, toInstant, toZoned } from './internal';

/**
 * Lazily generates `ZonedDateTime` values between `start` and `end` (inclusive),
 * advancing by `step` on each iteration.
 *
 * Returns a generator — use `for...of` for lazy consumption or spread to collect
 * into an array: `[...dateRange(...)]`.
 *
 * @throws {RangeError} when `step` does not advance the date forward.
 *
 * When `start` is a `ZonedDateTime`, the timezone is inferred from it. If `end` is in a
 * different timezone, it is silently re-projected into `start`'s timezone. Pass `options.tz`
 * explicitly to override.
 *
 * @example
 * ```ts
 * // Lazy — safe for large ranges
 * for (const day of dateRange(start, end, { days: 1 }, { tz: 'UTC' })) {
 *   if (someCondition(day)) break;
 * }
 *
 * // Collect to array
 * const days = [...dateRange(start, end, { days: 1 }, { tz: 'UTC' })];
 *
 * // ZonedDateTime inputs — tz is inferred, no need to pass options
 * const days = [...dateRange(zdtStart, zdtEnd, { days: 1 })];
 * ```
 */
export function* dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options: TimeOptions = {}) {
  const tz = inferTimeZone(start, options);
  const startZoned = toZoned(start, { ...options, tz });
  const endZoned = toZoned(end, { ...options, tz });

  if (Temporal.ZonedDateTime.compare(startZoned.add(step), startZoned) <= 0) {
    throw new RangeError('dateRange: step must advance the date forward');
  }

  let current = startZoned;

  while (Temporal.ZonedDateTime.compare(current, endZoned) <= 0) {
    yield current;
    current = current.add(step);
  }
}

/**
 * Lazily generates `ZonedDateTime` occurrences according to a recurrence rule.
 *
 * Supports `daily`, `weekly`, `monthly`, and `yearly` frequencies with an optional
 * `interval`, `count` limit, and `until` boundary (inclusive). The generator is
 * infinite when neither `count` nor `until` is provided — use `for...of` with
 * a `break` or a `count` limit.
 *
 * @example
 * ```ts
 * // Every Monday for 4 weeks
 * const mondays = [...recurrence(start, { frequency: 'weekly', count: 4 }, { tz: 'UTC' })];
 *
 * // Bi-weekly until a deadline
 * for (const date of recurrence(start, { frequency: 'weekly', interval: 2, until: deadline }, { tz: 'UTC' })) {
 *   schedule(date);
 * }
 *
 * // ZonedDateTime start — tz is inferred, no need to pass options
 * for (const date of recurrence(zdtStart, { frequency: 'daily', count: 7 })) {
 *   schedule(date);
 * }
 * ```
 */
export function recurrence(
  start: TimeInput,
  rule: RecurrenceRule,
  options: TimeOptions = {},
): Generator<Temporal.ZonedDateTime> {
  const { count, frequency, interval = 1, until } = rule;

  // Eager validation — fires at call time, not on first iteration.
  if (count === undefined && until === undefined) {
    throw new RangeError('recurrence: either count or until must be specified to prevent unbounded generation');
  }

  const tz = inferTimeZone(start, options);

  const step: Temporal.DurationLike =
    frequency === 'daily'
      ? { days: interval }
      : frequency === 'weekly'
        ? { weeks: interval }
        : frequency === 'monthly'
          ? { months: interval }
          : { years: interval };

  const endInstant = until !== undefined ? toInstant(until, { ...options, tz }) : undefined;

  return recurrenceGenerator(toZoned(start, { ...options, tz }), step, count, endInstant);
}

function* recurrenceGenerator(
  start: Temporal.ZonedDateTime,
  step: Temporal.DurationLike,
  count: number | undefined,
  endInstant: Temporal.Instant | undefined,
): Generator<Temporal.ZonedDateTime> {
  let current = start;
  let emitted = 0;

  while (true) {
    if (count !== undefined && emitted >= count) break;

    if (endInstant !== undefined && Temporal.Instant.compare(current.toInstant(), endInstant) > 0) break;

    yield current;
    emitted++;
    current = current.add(step);
  }
}
