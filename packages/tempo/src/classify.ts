import { Temporal } from '@js-temporal/polyfill';
import { toInstant, toZoned } from './_convert';
import { inferSharedTimeZone } from './_tz';
import { TempoInvalidInputError } from './errors';
import type {
  ClassifyExpiryInput,
  FixedDuration,
  TimeDiffResult,
  TimeDiffUnit,
  TimeInput,
  TimeZoneOptions,
} from './types';

const MILLIS = {
  day: 86_400_000,
  hour: 3_600_000,
  microsecond: 1 / 1_000,
  millisecond: 1,
  minute: 60_000,
  nanosecond: 1 / 1_000_000,
  second: 1_000,
  week: 604_800_000,
} as const;
const UNIT_ORDER: ReadonlyArray<{ field: keyof Temporal.Duration; unit: TimeDiffUnit }> = [
  { field: 'years', unit: 'year' },
  { field: 'months', unit: 'month' },
  { field: 'weeks', unit: 'week' },
  { field: 'days', unit: 'day' },
  { field: 'hours', unit: 'hour' },
  { field: 'minutes', unit: 'minute' },
  { field: 'seconds', unit: 'second' },
  { field: 'milliseconds', unit: 'millisecond' },
];

// Expiry classification is elapsed-time math. Calendar months and years are rejected rather than approximated.
function fixedDurationToMilliseconds(input: FixedDuration): number {
  const duration = Temporal.Duration.from(input);

  if (duration.years || duration.months) {
    throw new TempoInvalidInputError(
      'classifyExpiry thresholds cannot contain months or years. Use fixed elapsed-time units.',
    );
  }

  return (
    duration.weeks * MILLIS.week +
    duration.days * MILLIS.day +
    duration.hours * MILLIS.hour +
    duration.minutes * MILLIS.minute +
    duration.seconds * MILLIS.second +
    duration.milliseconds +
    duration.microseconds * MILLIS.microsecond +
    duration.nanoseconds * MILLIS.nanosecond
  );
}

export function classifyExpiry<K extends string>(input: ClassifyExpiryInput<K>): K | null {
  const reference = input.relativeTo ?? Temporal.Now.instant();
  const value = toInstant(input.value, input);
  const elapsed = value.epochMilliseconds - reference.epochMilliseconds;
  const thresholds = (Object.entries(input.thresholds) as Array<[K, FixedDuration]>)
    .map(([key, duration]) => ({ key, max: fixedDurationToMilliseconds(duration) }))
    .sort((left, right) => left.max - right.max);

  return thresholds.find(({ max }) => elapsed <= max)?.key ?? null;
}

function pickLargestUnit(duration: Temporal.Duration): TimeDiffResult {
  for (const { field, unit } of UNIT_ORDER) {
    const value = Math.abs(duration[field] as number);

    if (value > 0) return { unit, value };
  }

  return { unit: 'millisecond', value: 0 };
}

export function timeDiff(
  a: TimeInput,
  b: TimeInput = Temporal.Now.instant(),
  options: TimeZoneOptions = {},
): TimeDiffResult {
  if (!options.timeZone && a instanceof Temporal.Instant && b instanceof Temporal.Instant) {
    const left = a.toZonedDateTimeISO('UTC');
    const right = b.toZonedDateTimeISO('UTC');

    return pickLargestUnit(
      Temporal.ZonedDateTime.compare(left, right) <= 0
        ? right.since(left, { largestUnit: 'year' })
        : left.since(right, { largestUnit: 'year' }),
    );
  }

  const timeZone = inferSharedTimeZone([a, b], options);
  const left = toZoned(a, { timeZone });
  const right = toZoned(b, { timeZone });

  return pickLargestUnit(
    Temporal.ZonedDateTime.compare(left, right) <= 0
      ? right.since(left, { largestUnit: 'year' })
      : left.since(right, { largestUnit: 'year' }),
  );
}
