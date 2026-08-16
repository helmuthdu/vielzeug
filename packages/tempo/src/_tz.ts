import { Temporal } from '@js-temporal/polyfill';
import { fail, TempoInvalidTzError, TempoMissingTzError } from './errors';
import type { CalendarUnit, TimeInput, TimeZoneOptions } from './types';

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

export const CALENDAR_UNITS = new Set<CalendarUnit>(['day', 'month', 'week', 'year']);
