import { Temporal } from '@js-temporal/polyfill';

import type { BoundaryOptions, BoundaryUnit, TimeInput } from './types';

import { floorToUnit } from './_floor';
import { inferTimeZone } from './_tz';

// ─── Boundary step durations ──────────────────────────────────────────────────

const BOUNDARY_STEP: Record<BoundaryUnit, Temporal.DurationLike> = {
  day: { days: 1 },
  hour: { hours: 1 },
  minute: { minutes: 1 },
  month: { months: 1 },
  week: { weeks: 1 },
  year: { years: 1 },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the start of the given `unit` in the inferred or explicit timezone.
 *
 * @example
 * ```ts
 * startOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' })
 * // 2026-03-21T00:00:00+00:00[UTC]
 *
 * startOf(instant, 'week', { tz: 'UTC', weekStartsOn: 1 })
 * // Monday of the current week
 * ```
 */
export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);

  return floorToUnit(input, unit, { tz, weekStartsOn: options.weekStartsOn }).toZonedDateTimeISO(tz);
}

/**
 * Returns the last nanosecond of the given `unit` (exactly 1 ns before the next unit starts).
 *
 * @example
 * ```ts
 * endOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' })
 * // 2026-03-21T23:59:59.999999999+00:00[UTC]
 * ```
 */
export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const tz = inferTimeZone(input, options);
  const startInstant = floorToUnit(input, unit, { tz, weekStartsOn: options.weekStartsOn });

  return startInstant.toZonedDateTimeISO(tz).add(BOUNDARY_STEP[unit]).subtract({ nanoseconds: 1 });
}
