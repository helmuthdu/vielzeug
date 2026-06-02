import { Temporal } from '@js-temporal/polyfill';

import type { TimeInput, TimeOptions, TimeOptionsWithTz } from './types';

// ─── Error helpers ────────────────────────────────────────────────────────────

export function fail(message: string): never {
  throw new TypeError(`[tempo] ${message}`);
}

export function validateTz(tz: string): string {
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(tz);
  } catch {
    fail(
      `Unknown or invalid timezone: "${tz}". Expected an IANA timezone name (e.g. "America/New_York") or UTC offset (e.g. "+05:30").`,
    );
  }

  return tz;
}

// ─── Direct resolution (no intermediate ParsedTimeInput) ──────────────────────

/**
 * Converts any {@link TimeInput} to an absolute `Instant`.
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 */
export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  if (input instanceof Temporal.Instant) return input;

  if (input instanceof Temporal.ZonedDateTime) return input.toInstant();

  if (input instanceof Temporal.PlainDateTime) {
    if (!options.tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

    return input.toZonedDateTime(validateTz(options.tz), { disambiguation: options.prefer }).toInstant();
  }

  if (input instanceof Temporal.PlainDate) {
    if (!options.tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

    return input.toZonedDateTime({ timeZone: validateTz(options.tz) }).toInstant();
  }

  fail(`Unsupported time input type: ${String(input)}`);
}

/**
 * Projects any {@link TimeInput} into a specific timezone as a `ZonedDateTime`.
 */
export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  const tz = validateTz(options.tz);

  if (input instanceof Temporal.ZonedDateTime) return input.withTimeZone(tz);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(tz, { disambiguation: options.prefer });
  }

  if (input instanceof Temporal.PlainDate) {
    return input.toZonedDateTime({ timeZone: tz });
  }

  if (input instanceof Temporal.Instant) return input.toZonedDateTimeISO(tz);

  fail(`Unsupported time input type: ${String(input)}`);
}

// ─── Timezone inference ───────────────────────────────────────────────────────

export function inferTimeZone(input: TimeInput, options: TimeOptions): string {
  const tz = options.tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  if (!tz) fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.');

  return validateTz(tz);
}

export function inferSharedTimeZone(inputs: TimeInput[], options: TimeOptions): string {
  if (options.tz) return validateTz(options.tz);

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

// ─── Shared utilities ─────────────────────────────────────────────────────────

export function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

// Units that require timezone-aware context for calendar-accurate operations.
export const CALENDAR_UNITS = new Set<Temporal.DateTimeUnit>(['day', 'week', 'month', 'year']);

// Shared approximate millisecond constants for threshold arithmetic.
export const MS_PER_MONTH = 30.4375 * 86_400_000; // 365.25 / 12 days × 86400 s × 1000
