import { Temporal } from '@js-temporal/polyfill';

import type { BoundaryUnit, CompareOptions, TimeInput } from './types';

import { toInstant } from './_convert';
import { floorToUnit } from './_floor';
import { inferSharedTimeZone, normalizeRange } from './_tz';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveFlooredPair(
  a: TimeInput,
  b: TimeInput,
  unit: BoundaryUnit,
  options: CompareOptions,
): { left: Temporal.Instant; right: Temporal.Instant } {
  const tz = inferSharedTimeZone([a, b], options);
  const unitOpts = { tz, weekStartsOn: options.weekStartsOn };

  return {
    left: floorToUnit(a, unit, unitOpts),
    right: floorToUnit(b, unit, unitOpts),
  };
}

function resolveFlooredTriple(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  unit: BoundaryUnit,
  options: CompareOptions,
): { lower: Temporal.Instant; target: Temporal.Instant; upper: Temporal.Instant } {
  const tz = inferSharedTimeZone([value, start, end], options);
  const unitOpts = { tz, weekStartsOn: options.weekStartsOn };
  const target = floorToUnit(value, unit, unitOpts);
  const [lower, upper] = normalizeRange(floorToUnit(start, unit, unitOpts), floorToUnit(end, unit, unitOpts));

  return { lower, target, upper };
}

function compareByUnit(a: TimeInput, b: TimeInput, options: CompareOptions): number {
  if (!options.unit) {
    return Temporal.Instant.compare(toInstant(a, options), toInstant(b, options));
  }

  const { left, right } = resolveFlooredPair(a, b, options.unit, options);

  return Temporal.Instant.compare(left, right);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns `true` when `a` is strictly before `b` on the timeline.
 * Pass `options.unit` to compare by calendar boundary (e.g. same day).
 *
 * @example
 * ```ts
 * isBefore(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T11:00:00Z'))
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
 * isAfter(parseInstant('2026-03-21T11:00:00Z'), parseInstant('2026-03-21T10:00:00Z'))
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
 *   parseInstant('2026-03-21T11:00:00Z'),
 *   parseInstant('2026-03-21T10:00:00Z'),
 *   parseInstant('2026-03-21T12:00:00Z'),
 * ) // true
 * ```
 */
export function within(value: TimeInput, start: TimeInput, end: TimeInput, options: CompareOptions = {}): boolean {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
  }

  const { lower, target, upper } = resolveFlooredTriple(value, start, end, options.unit, options);

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

/**
 * Clamps `value` to within `[start, end]` (bounds normalized).
 *
 * When `value` is a `ZonedDateTime`, returns a `ZonedDateTime` in the same timezone.
 * Otherwise returns an `Instant`.
 *
 * When `options.unit` is set, all three inputs are floored to that calendar boundary before
 * clamping — the result is at the start of the boundary unit, not the original time-of-day.
 *
 * @example
 * ```ts
 * clamp(
 *   parseInstant('2026-03-21T13:00:00Z'),
 *   parseInstant('2026-03-21T10:00:00Z'),
 *   parseInstant('2026-03-21T12:00:00Z'),
 * ).toString() // '2026-03-21T12:00:00Z'
 *
 * clamp(
 *   parseZoned('2026-03-21T13:00:00+00:00[UTC]'),
 *   parseZoned('2026-03-21T10:00:00+00:00[UTC]'),
 *   parseZoned('2026-03-21T12:00:00+00:00[UTC]'),
 * ).toString() // '2026-03-21T12:00:00+00:00[UTC]'
 * ```
 */
export function clamp(
  value: Temporal.ZonedDateTime,
  start: TimeInput,
  end: TimeInput,
  options?: CompareOptions,
): Temporal.ZonedDateTime;
export function clamp(value: TimeInput, start: TimeInput, end: TimeInput, options?: CompareOptions): Temporal.Instant;
export function clamp(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  options: CompareOptions = {},
): Temporal.Instant | Temporal.ZonedDateTime {
  const isZoned = value instanceof Temporal.ZonedDateTime;
  const tz = isZoned ? value.timeZoneId : undefined;

  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    let clamped: Temporal.Instant;

    if (Temporal.Instant.compare(target, lower) < 0) clamped = lower;
    else if (Temporal.Instant.compare(target, upper) > 0) clamped = upper;
    else clamped = target;

    return isZoned && tz ? clamped.toZonedDateTimeISO(tz) : clamped;
  }

  const { lower, target, upper } = resolveFlooredTriple(value, start, end, options.unit, options);

  let clamped: Temporal.Instant;

  if (Temporal.Instant.compare(target, lower) < 0) clamped = lower;
  else if (Temporal.Instant.compare(target, upper) > 0) clamped = upper;
  else clamped = target;

  // For unit-based clamping, resolve the output tz from options or from value's zone
  const outTz = options.tz ?? tz ?? inferSharedTimeZone([value, start, end], options);

  return isZoned ? clamped.toZonedDateTimeISO(outTz) : clamped;
}
