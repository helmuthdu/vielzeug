import { Temporal } from '@js-temporal/polyfill';

import type { CompareOptions, TimeInput } from './types';

import { resolveUnitPair, resolveUnitRange } from './boundary';
import { normalizeRange, toInstant } from './internal';

function compareByUnit(a: TimeInput, b: TimeInput, options: CompareOptions): number {
  if (!options.unit) {
    return Temporal.Instant.compare(toInstant(a, options), toInstant(b, options));
  }

  const { left, right } = resolveUnitPair(
    a,
    b,
    options as CompareOptions & { unit: NonNullable<CompareOptions['unit']> },
  );

  return Temporal.Instant.compare(left, right);
}

/**
 * Returns `true` when `a` is strictly before `b` on the timeline.
 * Pass `options.unit` to compare by calendar boundary (e.g. same day).
 *
 * @example
 * ```ts
 * isBefore(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T11:00:00Z'))
 * // true
 * ```
 */
export function isBefore(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) < 0;
}

/**
 * Returns `true` when `a` is strictly after `b` on the timeline.
 * Pass `options.unit` to compare by calendar boundary (e.g. same day).
 *
 * @example
 * ```ts
 * isAfter(Temporal.Instant.from('2026-03-21T11:00:00Z'), Temporal.Instant.from('2026-03-21T10:00:00Z'))
 * // true
 * ```
 */
export function isAfter(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) > 0;
}

/**
 * Returns `true` when `a` and `b` represent the same point (or boundary unit) in time.
 *
 * @example
 * ```ts
 * isSame(a, b, { tz: 'America/New_York', unit: 'day' })
 * // true when a and b fall on the same calendar day in New York
 * ```
 */
export function isSame(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) === 0;
}

/**
 * Returns `true` when `value` falls within `[start, end]` (inclusive, bounds normalized).
 * Pass `options.unit` to floor all three inputs to a calendar boundary before comparing.
 *
 * @example
 * ```ts
 * within(
 *   Temporal.Instant.from('2026-03-21T11:00:00Z'),
 *   Temporal.Instant.from('2026-03-21T10:00:00Z'),
 *   Temporal.Instant.from('2026-03-21T12:00:00Z'),
 * ) // true
 * ```
 */
export function within(value: TimeInput, start: TimeInput, end: TimeInput, options: CompareOptions = {}): boolean {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
  }

  const { lower, target, upper } = resolveUnitRange(
    value,
    start,
    end,
    options as CompareOptions & { unit: NonNullable<CompareOptions['unit']> },
  );

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

/**
 * Clamps `value` to within `[start, end]` (bounds normalized), returning an `Instant`.
 * Pass `options.unit` to clamp by calendar boundary.
 *
 * @example
 * ```ts
 * clamp(
 *   Temporal.Instant.from('2026-03-21T13:00:00Z'),
 *   Temporal.Instant.from('2026-03-21T10:00:00Z'),
 *   Temporal.Instant.from('2026-03-21T12:00:00Z'),
 * ).toString() // '2026-03-21T12:00:00Z'
 * ```
 */
export function clamp(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  options: CompareOptions = {},
): Temporal.Instant {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    if (Temporal.Instant.compare(target, lower) < 0) return lower;

    if (Temporal.Instant.compare(target, upper) > 0) return upper;

    return target;
  }

  const { lower, target, upper } = resolveUnitRange(
    value,
    start,
    end,
    options as CompareOptions & { unit: NonNullable<CompareOptions['unit']> },
  );

  if (Temporal.Instant.compare(target, lower) < 0) return lower;

  if (Temporal.Instant.compare(target, upper) > 0) return upper;

  return target;
}
