import { Temporal } from '@js-temporal/polyfill';

import type { RecurrenceRule, TimeInput, TimeOptionsWithTz } from './types';

import { toInstant, toZoned } from './internal';

/**
 * Lazily generates `ZonedDateTime` values between `start` and `end` (inclusive),
 * advancing by `step` on each iteration.
 *
 * Returns a generator — use `for...of` for lazy consumption or spread to collect
 * into an array: `[...dateRange(...)]`.
 *
 * @throws {RangeError} when `step` does not advance the date forward.
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
 * ```
 */
export function* dateRange(start: TimeInput, end: TimeInput, step: Temporal.DurationLike, options: TimeOptionsWithTz) {
  const startZoned = toZoned(start, options);
  const endZoned = toZoned(end, options);

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
 * ```
 */
export function recurrence(
  start: TimeInput,
  rule: RecurrenceRule,
  options: TimeOptionsWithTz,
): Generator<Temporal.ZonedDateTime> {
  const { count, frequency, interval = 1, until } = rule;

  // Eager validation — fires at call time, not on first iteration.
  if (count === undefined && until === undefined) {
    throw new RangeError('recurrence: either count or until must be specified to prevent unbounded generation');
  }

  const step: Temporal.DurationLike =
    frequency === 'daily'
      ? { days: interval }
      : frequency === 'weekly'
        ? { weeks: interval }
        : frequency === 'monthly'
          ? { months: interval }
          : { years: interval };

  const endInstant = until !== undefined ? toInstant(until, options) : undefined;

  return (function* () {
    let current = toZoned(start, options);
    let emitted = 0;

    while (true) {
      if (count !== undefined && emitted >= count) break;

      if (endInstant !== undefined && Temporal.Instant.compare(current.toInstant(), endInstant) > 0) break;

      yield current;
      emitted++;
      current = current.add(step);
    }
  })();
}
