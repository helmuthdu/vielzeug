import { Temporal } from '@js-temporal/polyfill';

import type { BoundaryOptions, BoundaryUnit, TimeInput } from './types';

import { floorToUnit } from './_floor';
import { inferTimeZone } from './_tz';

const BOUNDARY_STEP: Record<BoundaryUnit, Temporal.DurationLike> = {
  day: { days: 1 },
  hour: { hours: 1 },
  minute: { minutes: 1 },
  month: { months: 1 },
  week: { weeks: 1 },
  year: { years: 1 },
};

export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const timeZone = inferTimeZone(input, options);

  return floorToUnit(input, unit, { timeZone, weekStartsOn: options.weekStartsOn }).toZonedDateTimeISO(timeZone);
}

export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const timeZone = inferTimeZone(input, options);
  const start = floorToUnit(input, unit, { timeZone, weekStartsOn: options.weekStartsOn });

  return start.toZonedDateTimeISO(timeZone).add(BOUNDARY_STEP[unit]).subtract({ nanoseconds: 1 });
}
