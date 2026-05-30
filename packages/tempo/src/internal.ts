import { Temporal } from '@js-temporal/polyfill';

import type { TimeInput, TimeOptions, TimeOptionsWithTz } from './types';

// ─── Error helpers ────────────────────────────────────────────────────────────

export function fail(message: string): never {
  throw new TypeError(`[tempo] ${message}`);
}

// ─── Direct resolution (no intermediate ParsedTimeInput) ──────────────────────

/**
 * Converts any {@link TimeInput} to an absolute `Instant`.
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 */
export function resolveInstant(input: TimeInput, options: TimeOptions): Temporal.Instant {
  if (input instanceof Temporal.Instant) return input;

  if (input instanceof Temporal.ZonedDateTime) return input.toInstant();

  if (input instanceof Temporal.PlainDateTime) {
    if (!options.tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

    return input.toZonedDateTime(options.tz, { disambiguation: options.prefer }).toInstant();
  }

  if (input instanceof Temporal.PlainDate) {
    if (!options.tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

    return input.toZonedDateTime({ timeZone: options.tz }).toInstant();
  }

  fail(`Unsupported time input type: ${String(input)}`);
}

/**
 * Projects any {@link TimeInput} into a specific timezone as a `ZonedDateTime`.
 */
export function resolveZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  if (input instanceof Temporal.ZonedDateTime) return input.withTimeZone(options.tz);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(options.tz, { disambiguation: options.prefer });
  }

  if (input instanceof Temporal.PlainDate) {
    return input.toZonedDateTime({ timeZone: options.tz });
  }

  // Instant
  return (input as Temporal.Instant).toZonedDateTimeISO(options.tz);
}

// ─── Timezone inference ───────────────────────────────────────────────────────

export function inferTimeZone(input: TimeInput, options: TimeOptions): string {
  const tz = options.tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  if (!tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

  return tz;
}

export function inferSharedTimeZone(inputs: TimeInput[], options: TimeOptions): string {
  if (options.tz) return options.tz;

  let inferred: string | undefined;

  for (const input of inputs) {
    if (!(input instanceof Temporal.ZonedDateTime)) continue;

    const tz = input.timeZoneId;

    if (!inferred) {
      inferred = tz;
      continue;
    }

    if (inferred !== tz) {
      fail('Comparison received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.');
    }
  }

  if (!inferred) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

  return inferred;
}

// ─── Display timezone resolution ──────────────────────────────────────────────

export function displayTz(input: TimeInput, tz?: string): string | undefined {
  return tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);
}

export function displayRangeTz(start: TimeInput, end: TimeInput, tz?: string): string | undefined {
  if (tz) return tz;

  const startTz = start instanceof Temporal.ZonedDateTime ? start.timeZoneId : undefined;
  const endTz = end instanceof Temporal.ZonedDateTime ? end.timeZoneId : undefined;

  if (startTz && endTz && startTz !== endTz) {
    fail('formatRange received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.');
  }

  return startTz ?? endTz;
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

export function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

// Units that require timezone-aware context for calendar-accurate operations.
export const CALENDAR_UNITS = new Set<Temporal.DateTimeUnit>(['day', 'week', 'month', 'year']);
