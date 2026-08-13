import { Temporal } from '@js-temporal/polyfill';
import { toZoned } from './_convert';
import { CALENDAR_UNITS, inferSharedTimeZone, inferTimeZone, validateTimeZone } from './_tz';
import { fail } from './errors';
import type { CalendarUnit, DifferenceInput, ParseAs, ShiftOptions, TimeInput } from './types';

/** Parse intentionally requires an explicit result kind: time strings are ambiguous at system boundaries. */
export function parse(input: string, options: { as: 'zonedDateTime' }): Temporal.ZonedDateTime;
export function parse(input: string, options: { as: 'instant' }): Temporal.Instant;
export function parse(input: string, options: { as: 'plainDateTime' }): Temporal.PlainDateTime;
export function parse(input: string, options: { as: 'plainDate' }): Temporal.PlainDate;
export function parse(input: string, options: { as: ParseAs }): TimeInput {
  try {
    if (options.as === 'zonedDateTime') return Temporal.ZonedDateTime.from(input);

    if (options.as === 'instant') return Temporal.Instant.from(input);

    if (options.as === 'plainDateTime') return Temporal.PlainDateTime.from(input);

    return Temporal.PlainDate.from(input);
  } catch {
    fail(`Invalid ${options.as} ISO 8601 string: "${input}".`);
  }
}

export function now(options: { timeZone: string }): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(validateTimeZone(options.timeZone));
}

export function nowInstant(): Temporal.Instant {
  return Temporal.Now.instant();
}

export function shift(
  input: Temporal.ZonedDateTime,
  duration: Temporal.DurationLike,
  options?: ShiftOptions,
): Temporal.ZonedDateTime;
export function shift(
  input: Exclude<TimeInput, Temporal.ZonedDateTime>,
  duration: Temporal.DurationLike,
  options: ShiftOptions & { timeZone: string },
): Temporal.ZonedDateTime;
export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: ShiftOptions = {},
): Temporal.ZonedDateTime {
  const timeZone = inferTimeZone(input, options);

  return toZoned(input, { disambiguation: options.disambiguation, timeZone }).add(duration);
}

export function difference(input: DifferenceInput): Temporal.Duration {
  const { end, largestUnit, roundingIncrement, roundingMode, smallestUnit, start } = input;
  const rounding = { largestUnit, roundingIncrement, roundingMode, smallestUnit };
  const needsCalendar =
    (largestUnit !== undefined && CALENDAR_UNITS.has(largestUnit as CalendarUnit)) ||
    (smallestUnit !== undefined && CALENDAR_UNITS.has(smallestUnit as CalendarUnit));

  if (!needsCalendar && start instanceof Temporal.Instant && end instanceof Temporal.Instant) {
    return end.since(start, rounding as Temporal.DifferenceOptions<Temporal.TimeUnit>);
  }

  const timeZone = inferSharedTimeZone([start, end], input);
  const options = { disambiguation: input.disambiguation, timeZone };

  return toZoned(end, options).since(toZoned(start, options), rounding);
}

export function isValid(value: unknown): value is TimeInput {
  return (
    value instanceof Temporal.Instant ||
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.PlainDateTime ||
    value instanceof Temporal.PlainDate
  );
}
