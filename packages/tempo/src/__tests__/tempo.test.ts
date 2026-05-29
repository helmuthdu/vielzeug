import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';

import {
  clamp,
  clearCaches,
  dateRange,
  difference,
  endOf,
  expires,
  format,
  formatDuration,
  formatInstant,
  formatRange,
  formatRelative,
  formatZoned,
  isAfter,
  isBefore,
  isSame,
  now,
  parseDuration,
  parseLocal,
  shift,
  startOf,
  timeDiff,
  toInstant,
  toZoned,
  within,
} from '../tempo';

// ─── Constants ────────────────────────────────────────────────────────────────

const MISSING_TZ = '[tempo] This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.';
const MISMATCH_ZONES =
  '[tempo] Comparison received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';

// ─── now ─────────────────────────────────────────────────────────────────────

describe('now', () => {
  it('returns a ZonedDateTime in the requested timezone', () => {
    expect(now('UTC').timeZoneId).toBe('UTC');
    expect(now('Asia/Tokyo').timeZoneId).toBe('Asia/Tokyo');
  });
});

// ─── parseLocal ───────────────────────────────────────────────────────────────────────────

describe('parseLocal', () => {
  it('parses a date-only string as midnight', () => {
    expect(parseLocal('2026-03-21').toString()).toBe('2026-03-21T00:00:00');
  });

  it('parses a date-time string', () => {
    expect(parseLocal('2026-03-21T10:15:30').toString()).toBe('2026-03-21T10:15:30');
  });

  it('throws a descriptive error for invalid input', () => {
    expect(() => parseLocal('not-a-date')).toThrow(
      '[tempo] Invalid local date/time string. Expected an ISO 8601 date or date-time string',
    );
  });
});

// ─── toInstant ────────────────────────────────────────────────────────────────

describe('toInstant', () => {
  it('passes Instant through unchanged', () => {
    const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(toInstant(instant).epochNanoseconds).toBe(instant.epochNanoseconds);
  });

  it('converts ZonedDateTime to its canonical instant', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    expect(toInstant(zoned).toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('converts PlainDateTime to instant using explicit tz', () => {
    expect(toInstant(parseLocal('2026-03-21T11:00:00'), { tz: 'Europe/Berlin' }).toString()).toBe(
      '2026-03-21T10:00:00Z',
    );
  });

  it('converts PlainDate to midnight instant in the given tz', () => {
    const date = Temporal.PlainDate.from('2026-03-21');

    expect(toInstant(date, { tz: 'UTC' }).toString()).toBe('2026-03-21T00:00:00Z');
  });

  it('respects DST fall-back disambiguation (earlier vs later)', () => {
    // Nov 1, 2026: clocks fall back at 2 AM — 1:30 AM happens twice in New York
    const ambiguous = Temporal.PlainDateTime.from('2026-11-01T01:30:00');

    expect(toInstant(ambiguous, { tz: 'America/New_York', when: 'earlier' }).toString()).toBe('2026-11-01T05:30:00Z');
    expect(toInstant(ambiguous, { tz: 'America/New_York', when: 'later' }).toString()).toBe('2026-11-01T06:30:00Z');
  });

  it('throws when tz is missing for plain input', () => {
    expect(() => toInstant(parseLocal('2026-03-21T10:00:00'))).toThrow(MISSING_TZ);
  });

  it('throws for unsupported input type at runtime', () => {
    expect(() => toInstant('2026-03-21T10:15:30Z' as unknown as Temporal.Instant)).toThrow(
      '[tempo] Unsupported time input type.',
    );
  });
});

// ─── toZoned ──────────────────────────────────────────────────────────────────

describe('toZoned', () => {
  it('projects Instant to the target timezone', () => {
    const zoned = toZoned(Temporal.Instant.from('2026-03-21T10:00:00Z'), { tz: 'Europe/Berlin' });

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });

  it('re-projects ZonedDateTime to a different timezone (same instant, new zone)', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = toZoned(ny, { tz: 'Europe/Berlin' });

    expect(berlin.timeZoneId).toBe('Europe/Berlin');
    expect(berlin.toInstant().toString()).toBe(ny.toInstant().toString());
  });
});

// ─── shift ────────────────────────────────────────────────────────────────────

describe('shift', () => {
  it('adds duration to a ZonedDateTime (infers timezone)', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]');

    expect(shift(start, { hours: 2 }).toString()).toBe('2026-03-21T12:00:00+01:00[Europe/Berlin]');
  });

  it('handles DST spring-forward correctly (skipped hour)', () => {
    // Mar 8, 2026: clocks spring forward at 2 AM in New York — 2:30 does not exist
    const start = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');

    expect(shift(start, { hours: 1 }).toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
  });

  it('accepts an explicit tz when input is an Instant', () => {
    const result = shift(Temporal.Instant.from('2026-03-21T10:00:00Z'), { hours: 1 }, { tz: 'UTC' });

    expect(result.timeZoneId).toBe('UTC');
    expect(result.toString()).toBe('2026-03-21T11:00:00+00:00[UTC]');
  });

  it('subtracts duration from a ZonedDateTime', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]');

    expect(shift(start, { hours: -2 }).toString()).toBe('2026-03-21T08:00:00+01:00[Europe/Berlin]');
  });

  it('throws when tz is missing for plain input', () => {
    expect(() => shift(parseLocal('2026-03-21T10:00:00'), { hours: 1 })).toThrow(MISSING_TZ);
  });
});

// ─── difference ───────────────────────────────────────────────────────────────

describe('difference', () => {
  it('computes duration between two instants without a timezone', () => {
    const duration = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:30:00Z'),
      { largestUnit: 'hour', smallestUnit: 'minute' },
    );

    expect(duration.toString()).toBe('PT2H30M');
  });

  it('accounts for DST spring-forward (23-hour day in New York)', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-08T00:00:00-05:00[America/New_York]');
    const end = Temporal.ZonedDateTime.from('2026-03-09T00:00:00-04:00[America/New_York]');

    expect(difference(start, end, { largestUnit: 'hour' }).hours).toBe(23);
  });

  it('infers timezone when one side is zoned and the other is instant', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const instant = Temporal.Instant.from('2026-03-21T15:00:00Z');

    expect(difference(zoned, instant, { largestUnit: 'hour' }).hours).toBe(1);
  });

  it('throws for conflicting zoned timezones when tz is omitted', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => difference(ny, berlin, { largestUnit: 'hour' })).toThrow(MISMATCH_ZONES);
  });

  it('accepts PlainDateTime inputs with explicit tz', () => {
    const start = parseLocal('2026-03-21T10:00:00');
    const end = parseLocal('2026-03-21T12:30:00');

    expect(difference(start, end, { largestUnit: 'hour', smallestUnit: 'minute', tz: 'UTC' }).toString()).toBe(
      'PT2H30M',
    );
  });

  it('computes duration between two Instants without a timezone for sub-day units', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const b = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(difference(a, b, { largestUnit: 'hour' }).hours).toBe(2);
  });

  it('still requires timezone when calendar units are requested for two Instants', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const b = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(() => difference(a, b, { largestUnit: 'day' })).toThrow(MISSING_TZ);
  });

  it('still requires timezone when smallestUnit is a calendar unit for two Instants', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const b = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(() => difference(a, b, { smallestUnit: 'day' })).toThrow(MISSING_TZ);
  });
  it('applies roundingMode when rounding to a coarser unit', () => {
    // PT1M40S rounded up to the nearest minute = PT2M
    const duration = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T10:01:40Z'),
      { largestUnit: 'minute', roundingMode: 'ceil', smallestUnit: 'minute', tz: 'UTC' },
    );

    expect(duration.toString()).toBe('PT2M');
  });

  it('respects roundingIncrement', () => {
    // PT1M40S with smallestUnit minute and roundingIncrement 5 → rounds to nearest 5 min = PT0M (floor toward 0)
    // Use 'halfExpand' so 1m40s rounds to 0 (closest 5-min boundary below is 0, above is 5)
    const duration = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T10:01:40Z'),
      { largestUnit: 'minute', roundingIncrement: 5, roundingMode: 'floor', smallestUnit: 'minute', tz: 'UTC' },
    );

    expect(duration.total('minutes')).toBe(0);
  });

  it('returns a negative Duration when start is after end', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-21T12:00:00+00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]');
    const duration = difference(start, end, { largestUnit: 'hour' });

    expect(duration.sign).toBe(-1);
    expect(Math.abs(duration.hours)).toBe(2);
  });
});

// ─── within ───────────────────────────────────────────────────────────────────

describe('within', () => {
  const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

  it('returns true for value inside range', () => {
    expect(within(Temporal.Instant.from('2026-03-21T11:00:00Z'), lo, hi)).toBe(true);
  });

  it('returns true at exact lower boundary', () => {
    expect(within(lo, lo, hi)).toBe(true);
  });

  it('returns true at exact upper boundary', () => {
    expect(within(hi, lo, hi)).toBe(true);
  });

  it('returns false for value outside range', () => {
    expect(within(Temporal.Instant.from('2026-03-21T09:59:59Z'), lo, hi)).toBe(false);
    expect(within(Temporal.Instant.from('2026-03-21T12:00:01Z'), lo, hi)).toBe(false);
  });

  it('normalizes reversed bounds', () => {
    expect(within(Temporal.Instant.from('2026-03-21T11:00:00Z'), hi, lo)).toBe(true);
  });

  it('supports calendar-unit comparison (result depends on timezone)', () => {
    // 05:00 UTC on Mar 22 = 01:00 AM EDT Mar 22.
    // start = 23:30 UTC Mar 21 = 7:30 PM EDT Mar 21
    // end   = 00:15 UTC Mar 22 = 8:15 PM EDT Mar 21
    // value = 05:00 UTC Mar 22 = 1:00 AM EDT Mar 22 → outside [Mar 21, Mar 21] in NY → false
    const value = Temporal.Instant.from('2026-03-22T05:00:00Z');
    const start = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const end = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(within(value, start, end, { tz: 'America/New_York', unit: 'day' })).toBe(false);
    expect(within(value, start, end, { tz: 'UTC', unit: 'day' })).toBe(true);
  });

  it('normalizes reversed bounds with unit option', () => {
    const value = Temporal.Instant.from('2026-03-21T12:00:00Z');
    const lo = Temporal.Instant.from('2026-03-20T00:00:00Z');
    const hi = Temporal.Instant.from('2026-03-22T00:00:00Z');

    expect(within(value, lo, hi, { tz: 'UTC', unit: 'day' })).toBe(true);
    expect(within(value, hi, lo, { tz: 'UTC', unit: 'day' })).toBe(true);
  });

  it('supports week unit comparison (weekStartsOn: 1)', () => {
    // Wednesday Mar 25 is in the ISO week of Mon Mar 23.
    const wednesday = Temporal.Instant.from('2026-03-25T10:00:00Z');
    const nextMonday = Temporal.Instant.from('2026-03-30T10:00:00Z');

    // wednesday falls within [week of Mar 23, week of Mar 30]
    expect(
      within(wednesday, Temporal.Instant.from('2026-03-23T00:00:00Z'), Temporal.Instant.from('2026-03-30T00:00:00Z'), {
        tz: 'UTC',
        unit: 'week',
        weekStartsOn: 1,
      }),
    ).toBe(true);

    // nextMonday (week of Mar 30) is NOT within a single-week range of Mar 23
    expect(
      within(
        nextMonday,
        Temporal.Instant.from('2026-03-23T00:00:00Z'),
        Temporal.Instant.from('2026-03-29T00:00:00Z'), // same week as Mar 23
        { tz: 'UTC', unit: 'week', weekStartsOn: 1 },
      ),
    ).toBe(false);
  });
});

// ─── clamp ────────────────────────────────────────────────────────────────────

describe('clamp', () => {
  const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

  it('returns value unchanged when inside range', () => {
    const value = Temporal.Instant.from('2026-03-21T11:00:00Z');

    expect(clamp(value, lo, hi).epochNanoseconds).toBe(value.epochNanoseconds);
  });

  it('clamps to lower bound when below range', () => {
    expect(clamp(Temporal.Instant.from('2026-03-21T09:00:00Z'), lo, hi).toString()).toBe('2026-03-21T10:00:00Z');
  });

  it('clamps to upper bound when above range', () => {
    expect(clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), lo, hi).toString()).toBe('2026-03-21T12:00:00Z');
  });

  it('returns Temporal.Instant projectable to any timezone', () => {
    // Mar 21, 12:00 UTC = 13:00 CET (UTC+1 in March)
    const clamped = clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), lo, hi);

    expect(clamped.toZonedDateTimeISO('UTC').toString()).toBe('2026-03-21T12:00:00+00:00[UTC]');
    expect(clamped.toZonedDateTimeISO('Europe/Berlin').hour).toBe(13);
  });

  it('supports calendar-unit comparison (clamps to day boundary)', () => {
    // value is on Mar 23 in NY → beyond Mar 22 upper bound → returns start of Mar 22 in NY.
    const result = clamp(
      Temporal.Instant.from('2026-03-23T05:00:00Z'),
      Temporal.Instant.from('2026-03-21T09:00:00Z'),
      Temporal.Instant.from('2026-03-22T18:00:00Z'),
      { tz: 'America/New_York', unit: 'day' },
    );

    expect(result.toString()).toBe('2026-03-22T04:00:00Z');
  });

  it('collapses same-unit bounds to a single clamped instant', () => {
    const result = clamp(
      Temporal.Instant.from('2026-03-23T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T09:00:00Z'),
      Temporal.Instant.from('2026-03-21T18:00:00Z'),
      { tz: 'UTC', unit: 'day' },
    );

    expect(result.toString()).toBe('2026-03-21T00:00:00Z');
  });

  it('normalizes reversed bounds', () => {
    const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

    // value below lo — reversed bounds should still clamp to lo
    expect(clamp(Temporal.Instant.from('2026-03-21T09:00:00Z'), hi, lo).toString()).toBe('2026-03-21T10:00:00Z');
    // value above hi — reversed bounds should still clamp to hi
    expect(clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), hi, lo).toString()).toBe('2026-03-21T12:00:00Z');
    // value inside — reversed bounds should pass through unchanged
    expect(clamp(Temporal.Instant.from('2026-03-21T11:00:00Z'), hi, lo).toString()).toBe('2026-03-21T11:00:00Z');
  });

  it('clamps by week boundary (weekStartsOn: 1)', () => {
    // value is in week of Mar 23; bounds are [week of Mar 30, week of Apr 6]
    // value is below lower bound → clamp to start of Mar 30 week
    const result = clamp(
      Temporal.Instant.from('2026-03-25T10:00:00Z'), // week of Mar 23
      Temporal.Instant.from('2026-03-30T10:00:00Z'), // week of Mar 30
      Temporal.Instant.from('2026-04-06T10:00:00Z'), // week of Apr 6
      { tz: 'UTC', unit: 'week', weekStartsOn: 1 },
    );

    expect(result.toString()).toBe('2026-03-30T00:00:00Z');
  });
});

// ─── isBefore and isAfter ─────────────────────────────────────────────────────

describe('isBefore and isAfter', () => {
  const earlier = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const later = Temporal.Instant.from('2026-03-21T11:00:00Z');

  it('isBefore returns true when a is earlier on the timeline', () => {
    expect(isBefore(earlier, later)).toBe(true);
    expect(isBefore(later, earlier)).toBe(false);
  });

  it('isAfter returns true when a is later on the timeline', () => {
    expect(isAfter(later, earlier)).toBe(true);
    expect(isAfter(earlier, later)).toBe(false);
  });

  it('both return false for equal instants', () => {
    expect(isBefore(earlier, earlier)).toBe(false);
    expect(isAfter(earlier, earlier)).toBe(false);
  });

  it('support unit-based calendar comparison (result changes with timezone)', () => {
    // 23:30 UTC Mar 21 = 7:30 PM EDT Mar 21; 00:15 UTC Mar 22 = 8:15 PM EDT Mar 21 → same day in NY
    const a = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const b = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(isBefore(a, b, { tz: 'UTC', unit: 'day' })).toBe(true);
    expect(isBefore(a, b, { tz: 'America/New_York', unit: 'day' })).toBe(false);
    expect(isAfter(b, a, { tz: 'UTC', unit: 'day' })).toBe(true);
  });

  it('supports week comparisons with weekStartsOn', () => {
    const sunday = Temporal.Instant.from('2026-03-22T10:00:00Z');
    const monday = Temporal.Instant.from('2026-03-23T10:00:00Z');

    expect(isBefore(sunday, monday, { tz: 'UTC', unit: 'week', weekStartsOn: 1 })).toBe(true);
    expect(isBefore(sunday, monday, { tz: 'UTC', unit: 'week', weekStartsOn: 7 })).toBe(false);
  });

  it('throws when plain input has no inferrable timezone', () => {
    const plain = parseLocal('2026-03-21T10:00:00');
    const instant = Temporal.Instant.from('2026-03-21T10:00:00Z');

    expect(() => isBefore(plain, instant)).toThrow(MISSING_TZ);
    expect(() => isAfter(plain, instant)).toThrow(MISSING_TZ);
    expect(() => isSame(plain, instant)).toThrow(MISSING_TZ);
  });

  it('throws for conflicting zoned timezones without explicit tz', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => isBefore(ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
    expect(() => isAfter(ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
  });
});

// ─── isSame ───────────────────────────────────────────────────────────────────

describe('isSame', () => {
  it('compares by day unit (result changes with timezone)', () => {
    const a = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const b = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(isSame(a, b, { tz: 'America/New_York', unit: 'day' })).toBe(true);
    expect(isSame(a, b, { tz: 'UTC', unit: 'day' })).toBe(false);
  });

  it('compares by month unit', () => {
    const a = Temporal.Instant.from('2026-03-01T00:00:00Z');
    const b = Temporal.Instant.from('2026-03-31T23:59:59Z');

    expect(isSame(a, b, { tz: 'UTC', unit: 'month' })).toBe(true);
    expect(isSame(a, Temporal.Instant.from('2026-04-01T00:00:00Z'), { tz: 'UTC', unit: 'month' })).toBe(false);
  });

  it('returns true for identical values', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');

    expect(isSame(a, a, { tz: 'UTC', unit: 'day' })).toBe(true);
    expect(isSame(a, a)).toBe(true);
  });

  it('compares two instants on the timeline when unit is omitted', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const b = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const c = Temporal.Instant.from('2026-03-21T11:00:00Z');

    expect(isSame(a, b)).toBe(true);
    expect(isSame(a, c)).toBe(false);
  });

  it('infers timezone symmetrically from either zoned argument', () => {
    // instant = 14:00 UTC = 10:00 AM EDT; zoned = 10:00 AM EDT — same wall-clock day
    const instant = Temporal.Instant.from('2026-03-21T14:00:00Z');
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');

    expect(isSame(instant, zoned, { unit: 'day' })).toBe(true);
    expect(isSame(zoned, instant, { unit: 'day' })).toBe(true);
  });

  it('throws for conflicting zoned timezones without explicit tz', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => isSame(ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
  });
});

// ─── startOf ──────────────────────────────────────────────────────────────────

describe('startOf', () => {
  it('snaps to start of day', () => {
    const input = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(startOf(input, 'day', { tz: 'UTC' }).toString()).toBe('2026-03-21T00:00:00+00:00[UTC]');
  });

  it('snaps to start of hour', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:45:30.123456789+00:00[UTC]');

    expect(startOf(input, 'hour').toString()).toBe('2026-03-21T10:00:00+00:00[UTC]');
  });

  it('snaps to start of month', () => {
    const input = Temporal.Instant.from('2026-03-21T10:00:00Z');

    expect(startOf(input, 'month', { tz: 'UTC' }).toString()).toBe('2026-03-01T00:00:00+00:00[UTC]');
  });

  it('snaps to start of year', () => {
    const input = Temporal.Instant.from('2026-09-15T10:00:00Z');

    expect(startOf(input, 'year', { tz: 'UTC' }).toString()).toBe('2026-01-01T00:00:00+00:00[UTC]');
  });

  it('snaps to start of minute', () => {
    const input = Temporal.Instant.from('2026-03-21T10:15:45.123Z');

    expect(startOf(input, 'minute', { tz: 'UTC' }).toString()).toBe('2026-03-21T10:15:00+00:00[UTC]');
  });

  it('infers timezone from ZonedDateTime input', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    expect(startOf(input, 'day').timeZoneId).toBe('America/New_York');
  });

  it('respects weekStartsOn for week unit', () => {
    const wednesday = Temporal.Instant.from('2026-03-25T12:00:00Z'); // UTC Wednesday

    expect(startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 1 }).toString()).toBe(
      '2026-03-23T00:00:00+00:00[UTC]',
    );
    expect(startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 7 }).toString()).toBe(
      '2026-03-22T00:00:00+00:00[UTC]',
    );
  });
});

// ─── endOf ────────────────────────────────────────────────────────────────────

describe('endOf', () => {
  it('snaps to end of day (23:59:59.999999999)', () => {
    const input = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(endOf(input, 'day', { tz: 'UTC' }).toString()).toBe('2026-03-21T23:59:59.999999999+00:00[UTC]');
  });

  it('is exactly 1ns before the next unit start', () => {
    const end = endOf(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'month', { tz: 'UTC' });
    const nextStart = startOf(Temporal.Instant.from('2026-04-01T00:00:00Z'), 'month', { tz: 'UTC' });

    expect(end.add({ nanoseconds: 1 }).epochNanoseconds).toBe(nextStart.epochNanoseconds);
  });

  it('infers timezone from ZonedDateTime input', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    expect(endOf(input, 'day').timeZoneId).toBe('America/New_York');
  });

  it('snaps to end of week (Sunday when weekStartsOn is Monday)', () => {
    // Wednesday Mar 25 → week starts Mon Mar 23 → ends Sun Mar 29 23:59:59.999999999
    const input = Temporal.Instant.from('2026-03-25T12:00:00Z');

    expect(endOf(input, 'week', { tz: 'UTC', weekStartsOn: 1 }).toString()).toBe(
      '2026-03-29T23:59:59.999999999+00:00[UTC]',
    );
  });

  it('snaps to end of week (Saturday when weekStartsOn is Sunday)', () => {
    // Wednesday Mar 25 → Sunday-starting week → starts Sun Mar 22 → ends Sat Mar 28
    const input = Temporal.Instant.from('2026-03-25T12:00:00Z');

    expect(endOf(input, 'week', { tz: 'UTC', weekStartsOn: 7 }).toString()).toBe(
      '2026-03-28T23:59:59.999999999+00:00[UTC]',
    );
  });
});

// ─── format ──────────────────────────────────────────────────────────────

describe('format', () => {
  it('formats with a pattern preset', () => {
    const result = format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });

  it('supports date-only and time-only presets', () => {
    const dateOnly = format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      locale: 'en-GB',
      pattern: 'date-only',
      tz: 'UTC',
    });
    const timeOnly = format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      locale: 'en-GB',
      pattern: 'time-only',
      tz: 'UTC',
    });

    expect(dateOnly).toContain('21/03/2026');
    expect(timeOnly).toContain('10:15');
  });

  it('infers timezone from ZonedDateTime input', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');

    expect(format(input, { locale: 'en-GB', pattern: 'date-only' })).toContain('21/03/2026');
  });

  it('uses intl option as the complete Intl.DateTimeFormat spec', () => {
    // intl with only time fields → no date in output
    const result = format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      intl: { hour: '2-digit', hour12: false, minute: '2-digit' },
      locale: 'en-US',
      tz: 'UTC',
    });

    expect(result).toContain('10:15');
    expect(result).not.toContain('2026');
  });

  it('returns stable output across repeated calls with same options', () => {
    const options = {
      intl: { hour: '2-digit', hour12: false, minute: '2-digit' } as Intl.DateTimeFormatOptions,
      locale: 'en-US',
      tz: 'UTC',
    };
    const input = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(format(input, options)).toBe(format(input, options));
  });

  it('honours intl.timeZone when options.tz is absent', () => {
    // 10:00 UTC = 11:00 in Europe/Berlin (UTC+1 in March)
    const input = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const withTzOption = format(input, { intl: { timeStyle: 'short' }, locale: 'en-GB', tz: 'Europe/Berlin' });
    const withIntlTimeZone = format(input, {
      intl: { timeStyle: 'short', timeZone: 'Europe/Berlin' },
      locale: 'en-GB',
    });

    // Both paths must produce the same output (11:00 Berlin local)
    expect(withIntlTimeZone).toBe(withTzOption);
  });

  it('throws for plain input without tz', () => {
    expect(() => format(parseLocal('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });

  it('formats a PlainDate with an explicit timezone', () => {
    const date = Temporal.PlainDate.from('2026-03-21');
    const result = format(date, { locale: 'en-GB', pattern: 'date-only', tz: 'UTC' });

    expect(result).toContain('21/03/2026');
  });

  it('formats a PlainDateTime with an explicit timezone', () => {
    const dt = parseLocal('2026-03-21T10:15:30');
    const result = format(dt, { locale: 'en-GB', pattern: 'short', tz: 'UTC' });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });
});

// ─── formatRange ──────────────────────────────────────────────────────────────

describe('formatRange', () => {
  it('formats a localized time span', () => {
    const result = formatRange(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:00:00Z'),
      { locale: 'en-GB', pattern: 'short', tz: 'UTC' },
    );

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:00');
    expect(result).toContain('12:00');
  });

  it('infers timezone from same-zone ZonedDateTime inputs', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]');
    const end = Temporal.ZonedDateTime.from('2026-03-21T12:00:00+01:00[Europe/Berlin]');
    const result = formatRange(start, end, { locale: 'en-GB', pattern: 'short' });

    expect(result).toContain('10:00');
    expect(result).toContain('12:00');
  });

  it('throws for mismatched ZonedDateTime timezones', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => formatRange(ny, berlin)).toThrow(
      '[tempo] formatRange received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.',
    );
  });
});

// ─── formatInstant ────────────────────────────────────────────────────────────

describe('formatInstant', () => {
  it('produces a UTC instant string from Instant', () => {
    expect(formatInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'))).toBe('2026-03-21T10:15:30Z');
  });

  it('converts ZonedDateTime to its UTC instant string', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T11:15:30+01:00[Europe/Berlin]');

    expect(formatInstant(zoned)).toBe('2026-03-21T10:15:30Z');
  });

  it('requires tz for plain input', () => {
    expect(() => formatInstant(parseLocal('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

// ─── formatZoned ──────────────────────────────────────────────────────────────

describe('formatZoned', () => {
  it('projects Instant to the given timezone', () => {
    expect(formatZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' })).toBe(
      '2026-03-21T11:15:30+01:00[Europe/Berlin]',
    );
  });

  it('infers timezone from ZonedDateTime input', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');

    expect(formatZoned(zoned)).toBe('2026-03-21T10:15:30+01:00[Europe/Berlin]');
  });

  it('throws for plain input without tz', () => {
    expect(() => formatZoned(parseLocal('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

// ─── formatRelative ───────────────────────────────────────────────────────────

describe('formatRelative', () => {
  it('formats future relative time from an explicit base', () => {
    const result = formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
      base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    expect(result).toBe('in 2 hours');
  });

  it('formats past relative time from an explicit base', () => {
    const result = formatRelative(Temporal.Instant.from('2026-03-21T10:00:00Z'), {
      base: Temporal.Instant.from('2026-03-21T12:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    expect(result).toBe('2 hours ago');
  });

  it('promotes near-threshold values to a higher unit', () => {
    // 59.6s rounds to 60s → promotes to "1 minute"
    const nearMinute = formatRelative(Temporal.Instant.from('2026-03-21T10:00:59.600Z'), {
      base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    // 3599.6s rounds to 3600s → promotes to "1 hour"
    const nearHour = formatRelative(Temporal.Instant.from('2026-03-21T10:59:59.600Z'), {
      base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    expect(nearMinute).toBe('in 1 minute');
    expect(nearHour).toBe('in 1 hour');
  });

  it('promotes rounded values at inner thresholds (e.g. 60 minutes -> 1 hour)', () => {
    const nearHourFromMinutes = formatRelative(Temporal.Instant.from('2026-03-21T10:59:34Z'), {
      base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    expect(nearHourFromMinutes).toBe('in 1 hour');
  });

  it('uses Temporal.Now.instant() when base is omitted', () => {
    const result = formatRelative(Temporal.Now.instant().add({ minutes: 2 }), {
      locale: 'en-US',
      numeric: 'always',
    });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a ZonedDateTime as the primary input', () => {
    const base = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const input = Temporal.ZonedDateTime.from('2026-03-21T15:00:00+00:00[UTC]');
    const result = formatRelative(input, { base, locale: 'en-US', numeric: 'always' });

    expect(result).toBe('in 5 hours');
  });

  it('accepts a ZonedDateTime as the base', () => {
    const input = Temporal.Instant.from('2026-03-21T12:00:00Z');
    const base = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]');
    const result = formatRelative(input, { base, locale: 'en-US', numeric: 'always' });

    expect(result).toBe('in 2 hours');
  });
});

// ─── parseDuration ────────────────────────────────────────────────────────────

describe('parseDuration', () => {
  it('parses an ISO duration string', () => {
    expect(parseDuration('PT2H30M').toString()).toBe('PT2H30M');
  });

  it('parses a DurationLike object', () => {
    expect(parseDuration({ hours: 2, minutes: 30 }).toString()).toBe('PT2H30M');
  });

  it('throws for invalid input', () => {
    expect(() => parseDuration('not-a-duration')).toThrow('[tempo] Invalid duration input.');
  });

  it('parses a negative ISO duration string', () => {
    const duration = parseDuration('-PT2H');

    expect(duration.sign).toBe(-1);
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('returns a string for ISO duration input', () => {
    const result = formatDuration('PT2H30M');

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a DurationLike object', () => {
    const result = formatDuration({ hours: 1, minutes: 30 });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to ISO string when Intl.DurationFormat is unavailable', () => {
    // Use a unique locale+style key so this test never hits the formatter cache.
    const intlRecord = Intl as Record<string, unknown>;
    const saved = intlRecord['DurationFormat'];

    intlRecord['DurationFormat'] = undefined;

    try {
      expect(formatDuration('PT2H30M', { locale: 'de-DE', style: 'narrow' })).toBe('PT2H30M');
      expect(formatDuration({ hours: 1, minutes: 30 }, { locale: 'de-DE', style: 'narrow' })).toBe('PT1H30M');
    } finally {
      intlRecord['DurationFormat'] = saved;
    }
  });
});

// ─── expires ─────────────────────────────────────────────────────────────────

describe('expires', () => {
  it('returns NEVER for year >= 9999', () => {
    const far = Temporal.Instant.from('9999-06-01T00:00:00Z');

    expect(expires(far)).toBe('NEVER');
  });

  it('returns EXPIRED for a past instant', () => {
    const past = Temporal.Instant.from('2000-01-01T00:00:00Z');

    expect(expires(past)).toBe('EXPIRED');
  });

  it('returns SOON for an instant within the default 7-day window', () => {
    const soon = Temporal.Now.instant().add({ hours: 48 });

    expect(expires(soon)).toBe('SOON');
  });

  it('returns LATER for an instant beyond the window', () => {
    const later = Temporal.Now.instant().add({ hours: 30 * 24 });

    expect(expires(later)).toBe('LATER');
  });

  it('respects a custom days threshold', () => {
    const inFiveDays = Temporal.Now.instant().add({ hours: 5 * 24 });

    expect(expires(inFiveDays, 3)).toBe('LATER');
    expect(expires(inFiveDays, 6)).toBe('SOON');
  });

  it('accepts ZonedDateTime', () => {
    const future = Temporal.Now.zonedDateTimeISO('UTC').add({ days: 30 });

    expect(expires(future)).toBe('LATER');
  });

  it('accepts PlainDate using UTC by default', () => {
    const past = parseLocal('2000-01-01');

    expect(expires(past)).toBe('EXPIRED');
  });

  it('accepts PlainDate with explicit tz option', () => {
    const past = parseLocal('2000-01-01');

    expect(expires(past, 7, { tz: 'America/New_York' })).toBe('EXPIRED');
  });

  it('returns EXPIRED for exactly-now (diff === 0)', () => {
    const alreadyPast = Temporal.Now.instant().subtract({ milliseconds: 1 });

    expect(expires(alreadyPast)).toBe('EXPIRED');
  });
});

// ─── timeDiff ────────────────────────────────────────────────────────────────

describe('timeDiff', () => {
  const base = Temporal.Instant.from('2026-01-01T00:00:00Z');

  it('returns years', () => {
    const target = base.add({ hours: 2 * 365 * 24 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'year', value: 2 });
  });

  it('returns months', () => {
    const target = base.add({ hours: 5 * 30 * 24 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'month', value: 5 });
  });

  it('returns weeks', () => {
    const target = base.add({ hours: 3 * 7 * 24 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'week', value: 3 });
  });

  it('returns days', () => {
    const target = base.add({ hours: 3 * 24 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'day', value: 3 });
  });

  it('returns hours', () => {
    const target = base.add({ minutes: 7 * 60 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'hour', value: 7 });
  });

  it('returns minutes', () => {
    const target = base.add({ seconds: 42 * 60 + 1 });

    expect(timeDiff(target, base)).toEqual({ unit: 'minute', value: 42 });
  });

  it('returns seconds', () => {
    const target = base.add({ seconds: 10 });

    expect(timeDiff(target, base)).toEqual({ unit: 'second', value: 10 });
  });

  it('is symmetric (past vs future)', () => {
    const target = base.subtract({ hours: 5 * 30 * 24 + 1 });

    expect(timeDiff(base, target)).toEqual({ unit: 'month', value: 5 });
  });

  it('accepts ZonedDateTime', () => {
    const a = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const b = Temporal.ZonedDateTime.from('2026-01-08T00:00:00[UTC]');

    expect(timeDiff(a, b)).toEqual({ unit: 'week', value: 1 });
  });

  it('defaults b to now when omitted', () => {
    const result = timeDiff(Temporal.Now.instant().subtract({ hours: 2 }));

    expect(result.unit).toBe('hour');
    expect(result.value).toBe(2);
  });
});

// ─── clearCaches ──────────────────────────────────────────────────────────────

describe('clearCaches', () => {
  it('can be called without throwing', () => {
    expect(() => clearCaches()).not.toThrow();
  });

  it('produces the same output after clearing as before (date formatter)', () => {
    const input = Temporal.Instant.from('2026-03-21T10:15:30Z');
    const options = { locale: 'en-GB', pattern: 'short' as const, tz: 'UTC' };
    const before = format(input, options);

    clearCaches();

    expect(format(input, options)).toBe(before);
  });

  it('produces the same output after clearing as before (relative formatter)', () => {
    const base = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const target = Temporal.Instant.from('2026-03-21T12:00:00Z');
    const before = formatRelative(target, { base, locale: 'en-US', numeric: 'always' });

    clearCaches();

    expect(formatRelative(target, { base, locale: 'en-US', numeric: 'always' })).toBe(before);
  });

  it('produces the same output after clearing as before (duration formatter)', () => {
    const before = formatDuration('PT2H30M');

    clearCaches();

    expect(formatDuration('PT2H30M')).toBe(before);
  });
});

// ─── dateRange ───────────────────────────────────────────────────────────────

describe('dateRange', () => {
  const opts = { tz: 'UTC' };

  it('generates daily range', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]');
    const result = dateRange(start, end, { days: 1 }, opts);

    expect(result).toHaveLength(5);
    expect(result[0].day).toBe(1);
    expect(result[4].day).toBe(5);
  });

  it('generates weekly range', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-29T00:00:00[UTC]');
    const result = dateRange(start, end, { weeks: 1 }, opts);

    expect(result).toHaveLength(5);
    expect(result[1].day).toBe(8);
  });

  it('generates monthly range', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-06-01T00:00:00[UTC]');
    const result = dateRange(start, end, { months: 1 }, opts);

    expect(result).toHaveLength(6);
    expect(result[5].month).toBe(6);
  });

  it('returns empty array when start is after end', () => {
    const start = Temporal.ZonedDateTime.from('2022-12-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');

    expect(dateRange(start, end, { days: 1 }, opts)).toEqual([]);
  });

  it('accepts PlainDate with explicit tz', () => {
    const start = parseLocal('2022-03-01');
    const end = parseLocal('2022-03-03');
    const result = dateRange(start, end, { days: 1 }, opts);

    expect(result).toHaveLength(3);
  });

  it('throws RangeError for a zero step', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]');

    expect(() => dateRange(start, end, { days: 0 }, opts)).toThrow(RangeError);
    expect(() => dateRange(start, end, { days: 0 }, opts)).toThrow('step must advance the date forward');
  });

  it('throws RangeError for a negative step', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]');

    expect(() => dateRange(start, end, { days: -1 }, opts)).toThrow('step must advance the date forward');
  });
});

// ─── timeDiff sub-second ──────────────────────────────────────────────────────

describe('timeDiff sub-second', () => {
  it('returns milliseconds for a sub-second diff', () => {
    const base = Temporal.Instant.from('2026-01-01T00:00:00Z');
    const target = base.add({ milliseconds: 400 });

    expect(timeDiff(base, target)).toEqual({ unit: 'millisecond', value: 400 });
  });

  it('returns milliseconds for a zero diff', () => {
    const base = Temporal.Instant.from('2026-01-01T00:00:00Z');

    expect(timeDiff(base, base)).toEqual({ unit: 'millisecond', value: 0 });
  });

  it('returns seconds for exactly 1000ms', () => {
    const base = Temporal.Instant.from('2026-01-01T00:00:00Z');
    const target = base.add({ milliseconds: 1000 });

    expect(timeDiff(base, target)).toEqual({ unit: 'second', value: 1 });
  });
});
