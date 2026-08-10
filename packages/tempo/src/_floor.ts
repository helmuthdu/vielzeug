import { Temporal } from '@js-temporal/polyfill';

import type { BoundaryUnit, Disambiguation, TimeInput } from './types';

import { toZoned } from './_convert';

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

export function floorToUnit(
  input: TimeInput,
  unit: BoundaryUnit,
  options: { disambiguation?: Disambiguation; timeZone: string; weekStartsOn?: number },
): Temporal.Instant {
  const zoned = toZoned(input, options);

  if (unit === 'week') {
    const daysToSubtract = (zoned.dayOfWeek - (options.weekStartsOn ?? 1) + 7) % 7;

    return zoned.subtract({ days: daysToSubtract }).with(TIME_ZERO).toInstant();
  }

  return zoned.with(BOUNDARY_CLEAR[unit]).toInstant();
}
