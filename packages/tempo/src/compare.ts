import { Temporal } from '@js-temporal/polyfill';
import { toInstant } from './_convert';
import { floorToUnit } from './_floor';
import { inferSharedTimeZone } from './_tz';
import type { CompareOptions, TimeInput } from './types';

function compareByUnit(a: TimeInput, b: TimeInput, options: CompareOptions): number {
  if (!options.unit) return Temporal.Instant.compare(toInstant(a, options), toInstant(b, options));

  const timeZone = inferSharedTimeZone([a, b], options);
  const unitOptions = { timeZone, weekStartsOn: options.weekStartsOn };

  return Temporal.Instant.compare(floorToUnit(a, options.unit, unitOptions), floorToUnit(b, options.unit, unitOptions));
}

export function isBefore(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) < 0;
}

export function isAfter(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) > 0;
}

export function isSame(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) === 0;
}
