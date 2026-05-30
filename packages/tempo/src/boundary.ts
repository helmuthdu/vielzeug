import { Temporal } from '@js-temporal/polyfill';

import type {
  BoundaryOptions,
  BoundaryUnit,
  CompareOptions,
  TimeInput,
  TimeOptionsWithTz,
  WeekStartDay,
} from './types';

import { inferSharedTimeZone, inferTimeZone, normalizeRange, resolveZoned } from './internal';

// ─── Boundary step durations ──────────────────────────────────────────────────

const BOUNDARY_STEP: Record<BoundaryUnit, Temporal.DurationLike> = {
  day: { days: 1 },
  hour: { hours: 1 },
  minute: { minutes: 1 },
  month: { months: 1 },
  week: { weeks: 1 },
  year: { years: 1 },
};

// ─── Boundary clear masks ─────────────────────────────────────────────────────

// Fields to zero out for start-of-unit. Week is handled explicitly.
const TIME_ZERO: Temporal.ZonedDateTimeLike = {
  hour: 0,
  microsecond: 0,
  millisecond: 0,
  minute: 0,
  nanosecond: 0,
  second: 0,
};

const BOUNDARY_CLEAR: Record<Exclude<BoundaryUnit, 'week'>, Temporal.ZonedDateTimeLike> = {
  day: TIME_ZERO,
  hour: { microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 },
  minute: { microsecond: 0, millisecond: 0, nanosecond: 0, second: 0 },
  month: { ...TIME_ZERO, day: 1 },
  year: { ...TIME_ZERO, day: 1, month: 1 },
};

// ─── Private helpers ──────────────────────────────────────────────────────────

function alignToWeekStart(value: Temporal.ZonedDateTime, weekStartsOn: WeekStartDay): Temporal.ZonedDateTime {
  const daysToSubtract = (value.dayOfWeek - weekStartsOn + 7) % 7;

  return value.subtract({ days: daysToSubtract });
}

function startOfInput(
  input: TimeInput,
  unit: BoundaryUnit,
  options: TimeOptionsWithTz & { weekStartsOn?: WeekStartDay },
): Temporal.ZonedDateTime {
  const zoned = resolveZoned(input, options);

  if (unit === 'week') return alignToWeekStart(zoned.with(TIME_ZERO), options.weekStartsOn ?? 1);

  return zoned.with(BOUNDARY_CLEAR[unit]);
}

function floorToBoundaryInstant(
  input: TimeInput,
  unit: BoundaryUnit,
  options: TimeOptionsWithTz & { weekStartsOn?: WeekStartDay },
): Temporal.Instant {
  return startOfInput(input, unit, options).toInstant();
}

// ─── Internal range helpers (used by compare.ts) ──────────────────────────────

export function resolveUnitRange(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  options: CompareOptions & { unit: BoundaryUnit },
): { lower: Temporal.Instant; target: Temporal.Instant; upper: Temporal.Instant } {
  const tz = inferSharedTimeZone([value, start, end], options);
  const unitOptions = { prefer: options.prefer, tz, weekStartsOn: options.weekStartsOn };
  const target = floorToBoundaryInstant(value, options.unit, unitOptions);
  const [lower, upper] = normalizeRange(
    floorToBoundaryInstant(start, options.unit, unitOptions),
    floorToBoundaryInstant(end, options.unit, unitOptions),
  );

  return { lower, target, upper };
}

export function resolveUnitPair(
  a: TimeInput,
  b: TimeInput,
  options: CompareOptions & { unit: BoundaryUnit },
): { left: Temporal.Instant; right: Temporal.Instant } {
  const tz = inferSharedTimeZone([a, b], options);
  const unitOptions = { prefer: options.prefer, tz, weekStartsOn: options.weekStartsOn };

  return {
    left: floorToBoundaryInstant(a, options.unit, unitOptions),
    right: floorToBoundaryInstant(b, options.unit, unitOptions),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the start of the given `unit` in the inferred or explicit timezone.
 *
 * @example
 * ```ts
 * startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' })
 * // 2026-03-21T00:00:00+00:00[UTC]
 *
 * startOf(instant, 'week', { tz: 'UTC', weekStartsOn: 1 })
 * // Monday of the current week
 * ```
 */
export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);

  return startOfInput(input, unit, { prefer: options.prefer, tz, weekStartsOn: options.weekStartsOn });
}

/**
 * Returns the last nanosecond of the given `unit` (exactly 1 ns before the next unit starts).
 *
 * @example
 * ```ts
 * endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' })
 * // 2026-03-21T23:59:59.999999999+00:00[UTC]
 * ```
 */
export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);

  return startOfInput(input, unit, { prefer: options.prefer, tz, weekStartsOn: options.weekStartsOn })
    .add(BOUNDARY_STEP[unit])
    .subtract({ nanoseconds: 1 });
}
