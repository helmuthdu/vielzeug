import { Temporal } from '@js-temporal/polyfill';

import type { CalendarUnit, TimeInput } from './types';

import { fail, TempoErrorCode } from './errors';

// ─── Timezone validation ──────────────────────────────────────────────────────

export function validateTz(tz: string): string {
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(tz);
  } catch {
    fail(
      `Unknown or invalid timezone: "${tz}". Expected an IANA timezone name (e.g. "America/New_York") or UTC offset (e.g. "+05:30").`,
      TempoErrorCode.INVALID_TZ,
    );
  }

  return tz;
}

// ─── Timezone inference ───────────────────────────────────────────────────────

export function inferTimeZone(input: TimeInput, options: { tz?: string }): string {
  const tz = options.tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  if (!tz)
    fail(
      'This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.',
      TempoErrorCode.MISSING_TZ,
    );

  return validateTz(tz);
}

export function inferSharedTimeZone(inputs: TimeInput[], options: { tz?: string }): string {
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

  if (!inferred)
    fail(
      'This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.',
      TempoErrorCode.MISSING_TZ,
    );

  return inferred;
}

// ─── Range normalization ──────────────────────────────────────────────────────

export function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

// ─── Shared constants ─────────────────────────────────────────────────────────

/** Units that require timezone-aware context for calendar-accurate operations. */
export const CALENDAR_UNITS = new Set<CalendarUnit>(['day', 'month', 'week', 'year']);

/** Approximate millisecond constants for threshold arithmetic. */
export const MS_PER_MONTH = 30.4375 * 86_400_000; // 365.25 / 12 days × 86400 s × 1000
