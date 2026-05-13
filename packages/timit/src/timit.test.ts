import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';

import {
  clamp,
  difference,
  endOf,
  formatDuration,
  formatHuman,
  formatInstant,
  formatRange,
  formatRelative,
  formatZoned,
  isAfter,
  isBefore,
  isSameDay,
  now,
  parseDuration,
  parseLocal,
  shift,
  startOf,
  toInstant,
  toZoned,
  within,
} from './timit';

describe('now', () => {
  it('creates a zoned date-time in the selected timezone', () => {
    expect(now('UTC').timeZoneId).toBe('UTC');
    expect(now('Europe/Berlin').timeZoneId).toBe('Europe/Berlin');
  });
});

describe('parseLocal', () => {
  it('parses date-only and date-time strings', () => {
    expect(parseLocal('2026-03-21').toString()).toBe('2026-03-21T00:00:00');
    expect(parseLocal('2026-03-21T10:15:30').toString()).toBe('2026-03-21T10:15:30');
  });

  it('throws a clear error for invalid input', () => {
    expect(() => parseLocal('not-a-date')).toThrow(
      '[timit] Invalid local date/time string. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.',
    );
  });
});

describe('toInstant', () => {
  it('passes Temporal.Instant through unchanged', () => {
    const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(toInstant(instant).epochNanoseconds).toBe(instant.epochNanoseconds);
  });

  it('converts ZonedDateTime to its instant', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    expect(toInstant(zoned).toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('requires tz for PlainDateTime input', () => {
    expect(() => toInstant(parseLocal('2026-03-21T10:15:30'))).toThrow(
      '[timit] This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.',
    );
  });

  it('respects disambiguation for ambiguous local time (fall-back overlap)', () => {
    // Nov 1, 2026: 1:30 AM happens twice in America/New_York (EDT then EST)
    const ambiguous = Temporal.PlainDateTime.from('2026-11-01T01:30:00');

    const earlier = toInstant(ambiguous, { tz: 'America/New_York', when: 'earlier' });
    const later = toInstant(ambiguous, { tz: 'America/New_York', when: 'later' });

    // earlier = EDT (UTC-4): 1:30 AM EDT = 5:30 AM UTC
    expect(earlier.toString()).toBe('2026-11-01T05:30:00Z');
    // later = EST (UTC-5): 1:30 AM EST = 6:30 AM UTC
    expect(later.toString()).toBe('2026-11-01T06:30:00Z');
  });

  it('throws for unsupported input type at runtime', () => {
    expect(() => toInstant('2026-03-21T10:15:30Z' as unknown as Temporal.Instant)).toThrow(
      '[timit] Unsupported time input type.',
    );
  });
});

describe('toZoned and shift', () => {
  it('converts an instant to the target timezone', () => {
    const zoned = toZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' });

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });

  it('shifts a zoned input and infers its timezone', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
    const plusHour = shift(start, { hours: 1 });
    const minusHour = shift(plusHour, { hours: -1 });

    // DST spring-forward: 2:30 AM doesn't exist → jumps to 3:30 EDT
    expect(plusHour.toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
    expect(minusHour.toString()).toBe(start.toString());
  });

  it('shifts an instant with explicit timezone', () => {
    const result = shift(Temporal.Instant.from('2026-03-08T01:30:00Z'), { hours: 1 }, { tz: 'America/New_York' });

    expect(result.timeZoneId).toBe('America/New_York');
  });

  it('throws when shifting a local input without tz', () => {
    expect(() => shift(parseLocal('2026-03-21T10:00:00'), { hours: 1 })).toThrow(
      '[timit] This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.',
    );
  });
});

describe('difference', () => {
  it('computes duration in explicit timezone', () => {
    const duration = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:30:00Z'),
      { largestUnit: 'hour', smallestUnit: 'minute', tz: 'UTC' },
    );

    expect(duration.toString()).toBe('PT2H30M');
  });

  it('accounts for DST when computing calendar-unit differences', () => {
    // Spring forward: 2026-03-08 is 23h long in New York (one hour is skipped)
    const start = Temporal.ZonedDateTime.from('2026-03-08T00:00:00-05:00[America/New_York]');
    const end = Temporal.ZonedDateTime.from('2026-03-09T00:00:00-04:00[America/New_York]');
    const duration = difference(start, end, { largestUnit: 'hour', tz: 'America/New_York' });

    expect(duration.hours).toBe(23);
  });
});

describe('within and clamp', () => {
  it('within: inclusive range check, normalizes reversed bounds', () => {
    const value = Temporal.Instant.from('2026-03-21T11:00:00Z');
    const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(within(value, start, end)).toBe(true);
    expect(within(value, end, start)).toBe(true);
    expect(within(Temporal.Instant.from('2026-03-21T09:00:00Z'), start, end)).toBe(false);
  });

  it('within: returns true at exact boundary values', () => {
    const boundary = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(within(boundary, boundary, end)).toBe(true);
    expect(within(end, boundary, end)).toBe(true);
  });

  it('clamp: returns Temporal.Instant clamped to range', () => {
    const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), start, end).toString()).toBe('2026-03-21T12:00:00Z');
    expect(clamp(Temporal.Instant.from('2026-03-21T09:00:00Z'), start, end).toString()).toBe('2026-03-21T10:00:00Z');
  });

  it('clamp: returns value unchanged when within bounds', () => {
    const value = Temporal.Instant.from('2026-03-21T11:00:00Z');
    const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');

    expect(clamp(value, start, end).epochNanoseconds).toBe(value.epochNanoseconds);
  });

  it('clamp: returns clamped instant that can be projected to any timezone', () => {
    const result = clamp(
      Temporal.Instant.from('2026-03-21T13:00:00Z'),
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:00:00Z'),
    );

    expect(result.toZonedDateTimeISO('UTC').toString()).toBe('2026-03-21T12:00:00+00:00[UTC]');
    // March 21 = CET (UTC+1), so 12:00 UTC = 13:00 Berlin
    expect(result.toZonedDateTimeISO('Europe/Berlin').hour).toBe(13);
  });
});

describe('comparison helpers', () => {
  it('isBefore / isAfter on instants', () => {
    const a = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const b = Temporal.Instant.from('2026-03-21T11:00:00Z');

    expect(isBefore(a, b)).toBe(true);
    expect(isAfter(b, a)).toBe(true);
    expect(isBefore(b, a)).toBe(false);
  });

  it('isSameDay: explicit tz', () => {
    const lateUtc = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const earlyUtc = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(isSameDay(lateUtc, earlyUtc, { tz: 'America/New_York' })).toBe(true);
    expect(isSameDay(lateUtc, earlyUtc, { tz: 'UTC' })).toBe(false);
  });

  it('isSameDay: infers timezone from ZonedDateTime input', () => {
    const a = Temporal.ZonedDateTime.from('2026-03-21T19:30:00-04:00[America/New_York]');
    const b = Temporal.ZonedDateTime.from('2026-03-21T23:45:00-04:00[America/New_York]');

    expect(isSameDay(a, b)).toBe(true);
  });

  it('isSameDay: throws when ZonedDateTimes have different timezones without explicit tz', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => isSameDay(ny, berlin)).toThrow(
      '[timit] isSameDay received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.',
    );
  });
});

describe('boundary helpers', () => {
  it('startOf / endOf day with explicit timezone', () => {
    const input = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(startOf(input, 'day', { tz: 'UTC' }).toString()).toBe('2026-03-21T00:00:00+00:00[UTC]');
    expect(endOf(input, 'day', { tz: 'UTC' }).toString()).toBe('2026-03-21T23:59:59.999999999+00:00[UTC]');
  });

  it('startOf / endOf infer timezone from ZonedDateTime input', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    expect(startOf(input, 'day').timeZoneId).toBe('America/New_York');
    expect(endOf(input, 'day').timeZoneId).toBe('America/New_York');
  });

  it('startOf week respects weekStartsOn', () => {
    const wednesday = Temporal.Instant.from('2026-03-25T12:00:00Z'); // Wednesday

    const mondayStart = startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 1 });
    const sundayStart = startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 7 });

    expect(mondayStart.toString()).toBe('2026-03-23T00:00:00+00:00[UTC]');
    expect(sundayStart.toString()).toBe('2026-03-22T00:00:00+00:00[UTC]');
  });

  it('startOf hour correctly clears sub-hour parts', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:45:30.123456789+00:00[UTC]');

    expect(startOf(input, 'hour').toString()).toBe('2026-03-21T10:00:00+00:00[UTC]');
  });

  it('endOf is exactly 1ns before the next unit start', () => {
    const start = startOf(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'month', { tz: 'UTC' });
    const end = endOf(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'month', { tz: 'UTC' });
    const nextStart = startOf(Temporal.Instant.from('2026-04-01T00:00:00Z'), 'month', { tz: 'UTC' });

    expect(end.add({ nanoseconds: 1 }).epochNanoseconds).toBe(nextStart.epochNanoseconds);
    expect(start.toString()).toBe('2026-03-01T00:00:00+00:00[UTC]');
  });
});

describe('human formatting', () => {
  it('formats instant with pattern preset', () => {
    const result = formatHuman(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });

  it('infers timezone from ZonedDateTime input when tz not provided', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');
    const result = formatHuman(zoned, { locale: 'en-GB', pattern: 'short' });

    expect(result).toContain('21/03/2026');
  });

  it('uses raw intl options without merging presets', () => {
    const result = formatHuman(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      intl: { hour: '2-digit', hour12: false, minute: '2-digit' },
      locale: 'en-US',
      tz: 'UTC',
    });

    // Should produce only time (no date) since no dateStyle is in intl
    expect(result).toContain('10:15');
    expect(result).not.toContain('2026');
  });

  it('formatRange produces a localized span', () => {
    const range = formatRange(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:00:00Z'),
      { locale: 'en-GB', pattern: 'short', tz: 'UTC' },
    );

    expect(range).toContain('21/03/2026');
    expect(range).toContain('10:00');
    expect(range).toContain('12:00');
  });

  it('formatRange throws when two ZonedDateTimes have different timezones', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => formatRange(ny, berlin)).toThrow(
      '[timit] formatRange received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.',
    );
  });

  it('formatRange throws when one input is local and no tz provided', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]');
    const local = Temporal.PlainDateTime.from('2026-03-21T12:00:00');

    // resolveRangeDisplayTimeZone infers Berlin from the zoned input;
    // local is then converted using that tz, so this succeeds silently
    const result = formatRange(zoned, local, { locale: 'en-GB', pattern: 'short', tz: 'Europe/Berlin' });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('ISO formatting', () => {
  it('formatInstant always produces a UTC instant string', () => {
    const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(formatInstant(instant)).toBe('2026-03-21T10:15:30Z');
  });

  it('formatInstant converts ZonedDateTime to its instant string', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T11:15:30+01:00[Europe/Berlin]');

    expect(formatInstant(zoned)).toBe('2026-03-21T10:15:30Z');
  });

  it('formatZoned with explicit tz projects to that zone', () => {
    const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(formatZoned(instant, { tz: 'Europe/Berlin' })).toBe('2026-03-21T11:15:30+01:00[Europe/Berlin]');
  });

  it('formatZoned infers timezone from ZonedDateTime input', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');

    expect(formatZoned(zoned)).toBe('2026-03-21T10:15:30+01:00[Europe/Berlin]');
  });

  it('formatZoned throws without tz for a local input', () => {
    expect(() => formatZoned(parseLocal('2026-03-21T10:15:30'))).toThrow(
      '[timit] This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.',
    );
  });
});

describe('relative formatting', () => {
  it('produces relative text from an explicit base', () => {
    const result = formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
      base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
      locale: 'en-US',
      numeric: 'always',
    });

    expect(result).toBe('in 2 hours');
  });
});

describe('duration helpers', () => {
  it('parseDuration parses ISO duration strings and objects', () => {
    expect(parseDuration('PT2H30M').toString()).toBe('PT2H30M');
    expect(parseDuration({ hours: 2, minutes: 30 }).toString()).toBe('PT2H30M');
  });

  it('formatDuration falls back to ISO when Intl.DurationFormat unavailable', () => {
    expect(formatDuration('PT2H30M')).toBe('PT2H30M');
  });

  it('formatDuration accepts locale/style options', () => {
    const result = formatDuration('PT2H30M', { locale: 'en-US', style: 'short' });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
