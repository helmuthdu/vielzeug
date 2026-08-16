import { Temporal } from '@js-temporal/polyfill';
import { toInstant } from './_convert';
import { floorToUnit } from './_floor';
import { inferSharedTimeZone } from './_tz';
import type { ClampInput, CompareOptions, ContainsInput, TimeInput } from './types';

function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

function compareByUnit(a: TimeInput, b: TimeInput, options: CompareOptions): number {
  if (!options.unit) return Temporal.Instant.compare(toInstant(a, options), toInstant(b, options));

  const timeZone = inferSharedTimeZone([a, b], options);
  const unitOptions = { timeZone, weekStartsOn: options.weekStartsOn };

  return Temporal.Instant.compare(floorToUnit(a, options.unit, unitOptions), floorToUnit(b, options.unit, unitOptions));
}

function resolveRange({ end, start, value, ...options }: ContainsInput | ClampInput): {
  lower: Temporal.Instant;
  target: Temporal.Instant;
  upper: Temporal.Instant;
} {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    return { lower, target, upper };
  }

  const timeZone = inferSharedTimeZone([value, start, end], options);
  const unitOptions = { timeZone, weekStartsOn: options.weekStartsOn };
  const target = floorToUnit(value, options.unit, unitOptions);
  const [lower, upper] = normalizeRange(
    floorToUnit(start, options.unit, unitOptions),
    floorToUnit(end, options.unit, unitOptions),
  );

  return { lower, target, upper };
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

export function contains(input: ContainsInput): boolean {
  const { lower, target, upper } = resolveRange(input);

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

export function clamp(input: ClampInput & { value: Temporal.ZonedDateTime }): Temporal.ZonedDateTime;
export function clamp(input: ClampInput): Temporal.Instant;
export function clamp(input: ClampInput): Temporal.Instant | Temporal.ZonedDateTime {
  const { lower, target, upper } = resolveRange(input);
  const clamped =
    Temporal.Instant.compare(target, lower) < 0 ? lower : Temporal.Instant.compare(target, upper) > 0 ? upper : target;

  return input.value instanceof Temporal.ZonedDateTime
    ? clamped.toZonedDateTimeISO(input.timeZone ?? input.value.timeZoneId)
    : clamped;
}
