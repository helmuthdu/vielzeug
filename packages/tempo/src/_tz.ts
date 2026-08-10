import { Temporal } from '@js-temporal/polyfill';

import type { CalendarUnit, TimeInput, TimeZoneOptions } from './types';

import { TempoInvalidTzError, TempoMissingTzError, fail } from './errors';

export function validateTimeZone(timeZone: string): string {
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(timeZone);
  } catch {
    fail(
      `Unknown or invalid timezone: "${timeZone}". Expected an IANA timezone name or UTC offset.`,
      TempoInvalidTzError,
    );
  }

  return timeZone;
}

export function inferTimeZone(input: TimeInput, options: TimeZoneOptions): string {
  const timeZone = options.timeZone ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  if (!timeZone) {
    fail(
      'This operation requires a timeZone. Pass options.timeZone or use a ZonedDateTime input.',
      TempoMissingTzError,
    );
  }

  return validateTimeZone(timeZone);
}

export function inferSharedTimeZone(inputs: readonly TimeInput[], options: TimeZoneOptions): string {
  if (options.timeZone) return validateTimeZone(options.timeZone);

  let inferred: string | undefined;

  for (const input of inputs) {
    if (!(input instanceof Temporal.ZonedDateTime)) continue;

    if (!inferred) inferred = input.timeZoneId;
    else if (inferred !== input.timeZoneId) {
      fail('Inputs use different time zones. Pass options.timeZone explicitly.');
    }
  }

  if (!inferred) {
    fail(
      'This operation requires a timeZone. Pass options.timeZone or use a ZonedDateTime input.',
      TempoMissingTzError,
    );
  }

  return inferred;
}

export function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

export const CALENDAR_UNITS = new Set<CalendarUnit>(['day', 'month', 'week', 'year']);
