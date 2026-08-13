import { Temporal } from '@js-temporal/polyfill';
import { validateTimeZone } from './_tz';
import { fail, TempoMissingTzError, TempoUnsupportedInputError } from './errors';
import type { AbsoluteTime, DisambiguationOptions, TimeInput, TimeZoneOptions, WallTime } from './types';

type ResolutionOptions = DisambiguationOptions & TimeZoneOptions;
type RequiredResolutionOptions = ResolutionOptions & { timeZone: string };

export function toInstant(input: AbsoluteTime): Temporal.Instant;
export function toInstant(input: WallTime, options: RequiredResolutionOptions): Temporal.Instant;
export function toInstant(input: TimeInput, options?: ResolutionOptions): Temporal.Instant;
export function toInstant(input: TimeInput, options: ResolutionOptions = {}): Temporal.Instant {
  if (input instanceof Temporal.Instant) return input;

  if (input instanceof Temporal.ZonedDateTime) return input.toInstant();

  if (!options.timeZone) {
    fail(
      'This operation requires a timeZone. Pass options.timeZone or use a ZonedDateTime input.',
      TempoMissingTzError,
    );
  }

  const timeZone = validateTimeZone(options.timeZone);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(timeZone, { disambiguation: options.disambiguation }).toInstant();
  }

  if (input instanceof Temporal.PlainDate) return input.toZonedDateTime({ timeZone }).toInstant();

  fail(`Unsupported time input type: ${String(input)}`, TempoUnsupportedInputError);
}

export function toZoned(input: TimeInput, options: RequiredResolutionOptions): Temporal.ZonedDateTime {
  const timeZone = validateTimeZone(options.timeZone);

  if (input instanceof Temporal.ZonedDateTime) return input.withTimeZone(timeZone);

  if (input instanceof Temporal.Instant) return input.toZonedDateTimeISO(timeZone);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(timeZone, { disambiguation: options.disambiguation });
  }

  if (input instanceof Temporal.PlainDate) return input.toZonedDateTime({ timeZone });

  fail(`Unsupported time input type: ${String(input)}`, TempoUnsupportedInputError);
}

export function inTimeZone(input: TimeInput, timeZone: string): Temporal.ZonedDateTime {
  return toZoned(input, { timeZone });
}
