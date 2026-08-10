import { Temporal } from '@js-temporal/polyfill';

import type { RecurrenceRule, TimeInput, TimeZoneOptions } from './types';

import { toInstant, toZoned } from './_convert';
import { inferTimeZone } from './_tz';
import { TempoInvalidInputError } from './errors';

export function dateRange(
  start: TimeInput,
  end: TimeInput,
  step: Temporal.DurationLike,
  options: TimeZoneOptions = {},
): Generator<Temporal.ZonedDateTime> {
  const timeZone = inferTimeZone(start, options);
  const startZoned = toZoned(start, { timeZone });
  const endZoned = toZoned(end, { timeZone });

  if (Temporal.ZonedDateTime.compare(startZoned.add(step), startZoned) <= 0) {
    throw new TempoInvalidInputError('dateRange: step must advance time forward.');
  }

  return generateRange(startZoned, endZoned, step);
}

function* generateRange(
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
  step: Temporal.DurationLike,
): Generator<Temporal.ZonedDateTime> {
  for (let current = start; Temporal.ZonedDateTime.compare(current, end) <= 0; current = current.add(step)) {
    yield current;
  }
}

export function recurrence(
  start: TimeInput,
  rule: RecurrenceRule,
  options: TimeZoneOptions = {},
): Generator<Temporal.ZonedDateTime> {
  const timeZone = inferTimeZone(start, options);
  const step =
    rule.frequency === 'daily'
      ? { days: rule.interval ?? 1 }
      : rule.frequency === 'weekly'
        ? { weeks: rule.interval ?? 1 }
        : rule.frequency === 'monthly'
          ? { months: rule.interval ?? 1 }
          : { years: rule.interval ?? 1 };
  const until = rule.until ? toInstant(rule.until, { timeZone }) : undefined;

  return generateRecurrence(toZoned(start, { timeZone }), step, rule.count, until);
}

function* generateRecurrence(
  start: Temporal.ZonedDateTime,
  step: Temporal.DurationLike,
  count: number | undefined,
  until: Temporal.Instant | undefined,
): Generator<Temporal.ZonedDateTime> {
  for (
    let current = start, emitted = 0;
    count === undefined || emitted < count;
    current = current.add(step), emitted++
  ) {
    if (until && Temporal.Instant.compare(current.toInstant(), until) > 0) return;

    yield current;
  }
}
