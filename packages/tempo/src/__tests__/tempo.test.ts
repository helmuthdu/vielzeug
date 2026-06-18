import { describe, expect, it } from 'vitest';

import type { RecurrenceRule } from '../index';

import { TempoError, TempoErrorCode } from '../index';
import {
  clamp,
  dateRange,
  difference,
  endOf,
  expires,
  format,
  formatDuration,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatZoned,
  humanize,
  inTz,
  isAfter,
  isBefore,
  isSame,
  isValid,
  now,
  nowInstant,
  parse,
  parseDuration,
  parseInstant,
  parsePlainDate,
  parsePlainDateTime,
  parseZoned,
  recurrence,
  shift,
  startOf,
  Temporal,
  timeDiff,
  toInstant,
  within,
} from '../index';

const MISSING_TZ = '[tempo] This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.';
const MISMATCH_ZONES =
  '[tempo] Comparison received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';

describe('now', () => {
  it('returns a ZonedDateTime in the requested timezone', () => {
    expect(now('UTC').timeZoneId).toBe('UTC');
    expect(now('Asia/Tokyo').timeZoneId).toBe('Asia/Tokyo');
  });

  it('throws for an invalid timezone', () => {
    expect(() => now('Bad/Zone')).toThrow();
  });
});

describe('nowInstant', () => {
  it('returns a Temporal.Instant close to the current time', () => {
    const before = Date.now();
    const t = nowInstant();
    const after = Date.now();

    expect(t.epochMilliseconds).toBeGreaterThanOrEqual(before);
    expect(t.epochMilliseconds).toBeLessThanOrEqual(after);
  });
});

describe('parseZoned', () => {
  it('parses a zoned date-time string', () => {
    const zdt = parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]');

    expect(zdt.timeZoneId).toBe('Europe/Berlin');
    expect(zdt.hour).toBe(11);
  });
  it('throws a descriptive [tempo] error for an invalid string', () => {
    expect(() => parseZoned('not-a-date')).toThrow('[tempo] Invalid zoned date-time string');
  });
});

describe('parsePlainDate', () => {
  it('parses a date-only string', () => {
    const d = parsePlainDate('2026-03-21');

    expect(d.year).toBe(2026);
    expect(d.month).toBe(3);
    expect(d.day).toBe(21);
  });
  it('throws a descriptive [tempo] error for an invalid string', () => {
    expect(() => parsePlainDate('not-a-date')).toThrow('[tempo] Invalid plain date string');
  });
});

describe('parsePlainDateTime', () => {
  it('parses a date-only string as midnight', () => {
    expect(parsePlainDateTime('2026-03-21').toString()).toBe('2026-03-21T00:00:00');
  });
  it('parses a date-time string', () => {
    expect(parsePlainDateTime('2026-03-21T10:15:30').toString()).toBe('2026-03-21T10:15:30');
  });
  it('throws a descriptive error including the invalid value', () => {
    expect(() => parsePlainDateTime('not-a-date')).toThrow('[tempo] Invalid date/time string: "not-a-date"');
  });
});

describe('parseInstant', () => {
  it('parses a UTC ISO string', () => {
    expect(parseInstant('2026-03-21T10:15:30Z').toString()).toBe('2026-03-21T10:15:30Z');
  });
  it('throws a descriptive error including the invalid value', () => {
    expect(() => parseInstant('not-an-instant')).toThrow('[tempo] Invalid instant string: "not-an-instant"');
  });
});

describe('Temporal re-export', () => {
  it('Temporal.Instant is accessible from @vielzeug/tempo', () => {
    expect(Temporal.Instant.from('2026-03-21T10:00:00Z').toString()).toBe('2026-03-21T10:00:00Z');
  });
  it('Temporal.Now is accessible from @vielzeug/tempo', () => {
    expect(Temporal.Now.instant()).toBeInstanceOf(Temporal.Instant);
  });
});

describe('toInstant', () => {
  it('passes Instant through unchanged', () => {
    const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

    expect(toInstant(instant).epochNanoseconds).toBe(instant.epochNanoseconds);
  });
  it('converts ZonedDateTime to its canonical instant', () => {
    expect(toInstant(Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]')).toString()).toBe(
      '2026-03-21T14:15:30Z',
    );
  });
  it('converts PlainDateTime to instant using explicit tz', () => {
    expect(toInstant(parsePlainDateTime('2026-03-21T11:00:00'), { tz: 'Europe/Berlin' }).toString()).toBe(
      '2026-03-21T10:00:00Z',
    );
  });
  it('converts PlainDate to midnight instant in the given tz', () => {
    expect(toInstant(Temporal.PlainDate.from('2026-03-21'), { tz: 'UTC' }).toString()).toBe('2026-03-21T00:00:00Z');
  });
  it('respects DST fall-back disambiguation via prefer option', () => {
    const ambiguous = Temporal.PlainDateTime.from('2026-11-01T01:30:00');

    expect(toInstant(ambiguous, { prefer: 'earlier', tz: 'America/New_York' }).toString()).toBe('2026-11-01T05:30:00Z');
    expect(toInstant(ambiguous, { prefer: 'later', tz: 'America/New_York' }).toString()).toBe('2026-11-01T06:30:00Z');
  });
  it('throws when tz is missing for plain input', () => {
    expect(() => toInstant(parsePlainDateTime('2026-03-21T10:00:00'))).toThrow(MISSING_TZ);
  });
  it('throws for unsupported input type', () => {
    expect(() => toInstant('2026-03-21T10:15:30Z' as unknown as Temporal.Instant)).toThrow(
      '[tempo] Unsupported time input type:',
    );
  });
  it('throws a [tempo] error for invalid tz with PlainDateTime input', () => {
    expect(() => toInstant(parsePlainDateTime('2026-03-21T10:00:00'), { tz: 'Bad/Zone' })).toThrow(
      '[tempo] Unknown or invalid timezone: "Bad/Zone"',
    );
  });
  it('throws a [tempo] error for invalid tz with PlainDate input', () => {
    expect(() => toInstant(Temporal.PlainDate.from('2026-03-21'), { tz: 'Bad/Zone' })).toThrow(
      '[tempo] Unknown or invalid timezone: "Bad/Zone"',
    );
  });
});

describe('inTz', () => {
  it('projects Instant to the target timezone', () => {
    const zoned = inTz(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'Europe/Berlin');

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });
  it('re-projects ZonedDateTime to a different timezone (same instant)', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = inTz(ny, 'Europe/Berlin');

    expect(berlin.toInstant().toString()).toBe(ny.toInstant().toString());
  });
  it('throws a [tempo] error for an invalid timezone', () => {
    expect(() => inTz(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'Bad/Zone')).toThrow(
      '[tempo] Unknown or invalid timezone: "Bad/Zone"',
    );
  });
});

describe('shift', () => {
  it('adds duration to a ZonedDateTime', () => {
    expect(
      shift(Temporal.ZonedDateTime.from('2026-03-21T10:00:00+01:00[Europe/Berlin]'), { hours: 2 }).toString(),
    ).toBe('2026-03-21T12:00:00+01:00[Europe/Berlin]');
  });
  it('handles DST spring-forward correctly', () => {
    expect(
      shift(Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]'), { hours: 1 }).toString(),
    ).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
  });
  it('accepts an explicit tz when input is an Instant', () => {
    const result = shift(Temporal.Instant.from('2026-03-21T10:00:00Z'), { hours: 1 }, { tz: 'UTC' });

    expect(result.toString()).toBe('2026-03-21T11:00:00+00:00[UTC]');
  });
  it('throws when tz is missing for plain input', () => {
    expect(() => shift(parsePlainDateTime('2026-03-21T10:00:00') as any, { hours: 1 })).toThrow(MISSING_TZ);
  });
  it('throws a [tempo] error for an unknown timezone string', () => {
    expect(() => shift(Temporal.Instant.from('2026-03-21T10:00:00Z'), { hours: 1 }, { tz: 'Not/Real' })).toThrow(
      '[tempo] Unknown or invalid timezone: "Not/Real"',
    );
  });
});

describe('difference', () => {
  it('computes duration between two instants without a timezone', () => {
    expect(
      difference(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T12:30:00Z'), {
        largestUnit: 'hour',
        smallestUnit: 'minute',
      }).toString(),
    ).toBe('PT2H30M');
  });
  it('accounts for DST spring-forward (23-hour day in New York)', () => {
    expect(
      difference(
        Temporal.ZonedDateTime.from('2026-03-08T00:00:00-05:00[America/New_York]'),
        Temporal.ZonedDateTime.from('2026-03-09T00:00:00-04:00[America/New_York]'),
        { largestUnit: 'hour' },
      ).hours,
    ).toBe(23);
  });
  it('still requires timezone when calendar units are requested for two Instants', () => {
    expect(() =>
      difference(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T12:00:00Z'), {
        largestUnit: 'day',
      }),
    ).toThrow(MISSING_TZ);
  });
  it('computes duration between two PlainDate inputs with tz', () => {
    expect(
      difference(Temporal.PlainDate.from('2026-01-01'), Temporal.PlainDate.from('2026-03-21'), {
        largestUnit: 'day',
        tz: 'UTC',
      }).days,
    ).toBe(79);
  });
  it('respects roundingMode when smallestUnit is set', () => {
    const dur = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T10:01:29Z'),
      { largestUnit: 'minute', roundingMode: 'ceil', smallestUnit: 'minute' },
    );

    expect(dur.minutes).toBe(2);
  });
  it('returns a negative Duration when start is after end', () => {
    const dur = difference(
      Temporal.ZonedDateTime.from('2026-03-21T12:00:00+00:00[UTC]'),
      Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]'),
      { largestUnit: 'hour' },
    );

    expect(dur.sign).toBe(-1);
    expect(Math.abs(dur.hours)).toBe(2);
  });

  it('respects roundingIncrement when smallestUnit is set', () => {
    const dur = difference(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T10:07:30Z'),
      { largestUnit: 'minute', roundingIncrement: 5, roundingMode: 'floor', smallestUnit: 'minute' },
    );

    expect(dur.minutes).toBe(5);
  });
});

describe('within', () => {
  const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

  it('returns true for value inside range', () => {
    expect(within(Temporal.Instant.from('2026-03-21T11:00:00Z'), lo, hi)).toBe(true);
  });
  it('returns true at boundaries', () => {
    expect(within(lo, lo, hi)).toBe(true);
    expect(within(hi, lo, hi)).toBe(true);
  });
  it('returns false for value outside range', () => {
    expect(within(Temporal.Instant.from('2026-03-21T09:59:59Z'), lo, hi)).toBe(false);
  });
  it('normalizes reversed bounds', () => {
    expect(within(Temporal.Instant.from('2026-03-21T11:00:00Z'), hi, lo)).toBe(true);
  });
  it('supports calendar-unit comparison', () => {
    const value = Temporal.Instant.from('2026-03-22T05:00:00Z');
    const start = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const end = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(within(value, start, end, { tz: 'America/New_York', unit: 'day' })).toBe(false);
    expect(within(value, start, end, { tz: 'UTC', unit: 'day' })).toBe(true);
  });

  it('throws for mismatched ZonedDateTime timezones when unit is specified', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => within(ny, ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
  });
});

describe('clamp', () => {
  const lo = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const hi = Temporal.Instant.from('2026-03-21T12:00:00Z');

  it('returns value unchanged when inside range', () => {
    const value = Temporal.Instant.from('2026-03-21T11:00:00Z');

    expect(clamp(value, lo, hi).epochNanoseconds).toBe(value.epochNanoseconds);
  });
  it('clamps to lower bound', () => {
    expect(clamp(Temporal.Instant.from('2026-03-21T09:00:00Z'), lo, hi).toString()).toBe('2026-03-21T10:00:00Z');
  });
  it('clamps to upper bound', () => {
    expect(clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), lo, hi).toString()).toBe('2026-03-21T12:00:00Z');
  });
  it('normalizes reversed bounds', () => {
    expect(clamp(Temporal.Instant.from('2026-03-21T09:00:00Z'), hi, lo).toString()).toBe('2026-03-21T10:00:00Z');
    expect(clamp(Temporal.Instant.from('2026-03-21T13:00:00Z'), hi, lo).toString()).toBe('2026-03-21T12:00:00Z');
  });
  it('supports calendar-unit comparison', () => {
    const result = clamp(
      Temporal.Instant.from('2026-03-23T05:00:00Z'),
      Temporal.Instant.from('2026-03-21T09:00:00Z'),
      Temporal.Instant.from('2026-03-22T18:00:00Z'),
      { tz: 'America/New_York', unit: 'day' },
    );

    expect(result.toString()).toBe('2026-03-22T04:00:00Z');
  });

  it('throws for mismatched ZonedDateTime timezones when unit is specified', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => clamp(ny, ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
  });

  it('returns ZonedDateTime for ZonedDateTime value with options.unit (C1)', () => {
    const wednesday = Temporal.ZonedDateTime.from('2026-03-18T15:30:00+00:00[UTC]');
    const monday = Temporal.ZonedDateTime.from('2026-03-16T00:00:00+00:00[UTC]');
    const friday = Temporal.ZonedDateTime.from('2026-03-20T00:00:00+00:00[UTC]');
    const result = clamp(wednesday, monday, friday, { tz: 'UTC', unit: 'day' });

    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((result as Temporal.ZonedDateTime).timeZoneId).toBe('UTC');
  });
});

describe('isBefore / isAfter / isSame', () => {
  const earlier = Temporal.Instant.from('2026-03-21T10:00:00Z');
  const later = Temporal.Instant.from('2026-03-21T11:00:00Z');

  it('isBefore', () => {
    expect(isBefore(earlier, later)).toBe(true);
    expect(isBefore(later, earlier)).toBe(false);
  });
  it('isAfter', () => {
    expect(isAfter(later, earlier)).toBe(true);
    expect(isAfter(earlier, later)).toBe(false);
  });
  it('both false for equal', () => {
    expect(isBefore(earlier, earlier)).toBe(false);
    expect(isAfter(earlier, earlier)).toBe(false);
  });
  it('calendar-unit comparison changes with timezone', () => {
    const a = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const b = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(isBefore(a, b, { tz: 'UTC', unit: 'day' })).toBe(true);
    expect(isBefore(a, b, { tz: 'America/New_York', unit: 'day' })).toBe(false);
  });
  it('isSame with day unit', () => {
    const a = Temporal.Instant.from('2026-03-21T23:30:00Z');
    const b = Temporal.Instant.from('2026-03-22T00:15:00Z');

    expect(isSame(a, b, { tz: 'America/New_York', unit: 'day' })).toBe(true);
    expect(isSame(a, b, { tz: 'UTC', unit: 'day' })).toBe(false);
  });
  it('throws when plain input has no inferrable timezone', () => {
    const plain = parsePlainDateTime('2026-03-21T10:00:00');

    expect(() => isBefore(plain, later)).toThrow(MISSING_TZ);
  });
  it('throws for conflicting zoned timezones', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => isBefore(ny, berlin, { unit: 'day' })).toThrow(MISMATCH_ZONES);
  });
});

describe('startOf', () => {
  it('snaps to start of day', () => {
    expect(startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' }).toString()).toBe(
      '2026-03-21T00:00:00+00:00[UTC]',
    );
  });
  it('snaps to start of month', () => {
    expect(startOf(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'month', { tz: 'UTC' }).toString()).toBe(
      '2026-03-01T00:00:00+00:00[UTC]',
    );
  });
  it('snaps to start of year', () => {
    expect(startOf(Temporal.Instant.from('2026-09-15T10:00:00Z'), 'year', { tz: 'UTC' }).toString()).toBe(
      '2026-01-01T00:00:00+00:00[UTC]',
    );
  });
  it('infers timezone from ZonedDateTime', () => {
    expect(startOf(Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]'), 'day').timeZoneId).toBe(
      'America/New_York',
    );
  });
  it('respects weekStartsOn', () => {
    const wednesday = Temporal.Instant.from('2026-03-25T12:00:00Z');

    expect(startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 1 }).toString()).toBe(
      '2026-03-23T00:00:00+00:00[UTC]',
    );
    expect(startOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 7 }).toString()).toBe(
      '2026-03-22T00:00:00+00:00[UTC]',
    );
  });

  it('snaps to start of hour', () => {
    expect(startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'hour', { tz: 'UTC' }).toString()).toBe(
      '2026-03-21T10:00:00+00:00[UTC]',
    );
  });

  it('snaps to start of minute', () => {
    expect(startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'minute', { tz: 'UTC' }).toString()).toBe(
      '2026-03-21T10:15:00+00:00[UTC]',
    );
  });
});

describe('endOf', () => {
  it('snaps to end of day', () => {
    expect(endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' }).toString()).toBe(
      '2026-03-21T23:59:59.999999999+00:00[UTC]',
    );
  });
  it('is exactly 1ns before next unit start', () => {
    const end = endOf(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'month', { tz: 'UTC' });
    const nextStart = startOf(Temporal.Instant.from('2026-04-01T00:00:00Z'), 'month', { tz: 'UTC' });

    expect(end.add({ nanoseconds: 1 }).epochNanoseconds).toBe(nextStart.epochNanoseconds);
  });

  it('snaps to end of year', () => {
    expect(endOf(Temporal.Instant.from('2026-06-15T10:00:00Z'), 'year', { tz: 'UTC' }).toString()).toBe(
      '2026-12-31T23:59:59.999999999+00:00[UTC]',
    );
  });

  it('snaps to end of week respecting weekStartsOn', () => {
    const wednesday = parseInstant('2026-03-25T12:00:00Z');

    // week starting Monday — end is Sunday 23:59:59.999999999
    expect(endOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 1 }).toString()).toBe(
      '2026-03-29T23:59:59.999999999+00:00[UTC]',
    );
    // week starting Sunday — end is Saturday 23:59:59.999999999
    expect(endOf(wednesday, 'week', { tz: 'UTC', weekStartsOn: 7 }).toString()).toBe(
      '2026-03-28T23:59:59.999999999+00:00[UTC]',
    );
  });
});

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
  it('uses intl option', () => {
    const result = format(Temporal.Instant.from('2026-03-21T10:15:30Z'), {
      intl: { hour: '2-digit', hour12: false, minute: '2-digit' },
      locale: 'en-US',
      tz: 'UTC',
    });

    expect(result).toContain('10:15');
    expect(result).not.toContain('2026');
  });
  it('throws for plain input without tz', () => {
    expect(() => format(parsePlainDateTime('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

describe('formatRange', () => {
  it('formats a time span', () => {
    const result = formatRange(
      Temporal.Instant.from('2026-03-21T10:00:00Z'),
      Temporal.Instant.from('2026-03-21T12:00:00Z'),
      { locale: 'en-GB', pattern: 'short', tz: 'UTC' },
    );

    expect(result).toContain('10:00');
    expect(result).toContain('12:00');
  });
  it('throws for mismatched ZonedDateTime timezones', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => formatRange(ny, berlin)).toThrow(
      '[tempo] formatRange received ZonedDateTime inputs with different time zones.',
    );
  });
});

describe('formatInstant', () => {
  it('produces a UTC instant string', () => {
    expect(formatInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'))).toBe('2026-03-21T10:15:30Z');
  });
  it('converts ZonedDateTime to UTC string', () => {
    expect(formatInstant(Temporal.ZonedDateTime.from('2026-03-21T11:15:30+01:00[Europe/Berlin]'))).toBe(
      '2026-03-21T10:15:30Z',
    );
  });
  it('requires tz for plain input', () => {
    expect(() => formatInstant(parsePlainDateTime('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

describe('formatZoned', () => {
  it('projects Instant to given timezone', () => {
    expect(formatZoned(Temporal.Instant.from('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' })).toBe(
      '2026-03-21T11:15:30+01:00[Europe/Berlin]',
    );
  });
  it('infers timezone from ZonedDateTime', () => {
    expect(formatZoned(Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]'))).toBe(
      '2026-03-21T10:15:30+01:00[Europe/Berlin]',
    );
  });
  it('throws for plain input without tz', () => {
    expect(() => formatZoned(parsePlainDateTime('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

describe('formatRelative', () => {
  it('formats future relative time', () => {
    expect(
      formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
        base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
        locale: 'en-US',
        numeric: 'always',
      }),
    ).toBe('in 2 hours');
  });
  it('formats past relative time', () => {
    expect(
      formatRelative(Temporal.Instant.from('2026-03-21T10:00:00Z'), {
        base: Temporal.Instant.from('2026-03-21T12:00:00Z'),
        locale: 'en-US',
        numeric: 'always',
      }),
    ).toBe('2 hours ago');
  });
  it('accepts ZonedDateTime', () => {
    expect(
      formatRelative(Temporal.ZonedDateTime.from('2026-03-21T15:00:00+00:00[UTC]'), {
        base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
        locale: 'en-US',
        numeric: 'always',
      }),
    ).toBe('in 5 hours');
  });
  it('accepts ZonedDateTime as base', () => {
    expect(
      formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
        base: Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]'),
        locale: 'en-US',
        numeric: 'always',
      }),
    ).toBe('in 2 hours');
  });

  it('respects style: short option', () => {
    const base = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const target = Temporal.Instant.from('2026-03-21T11:00:00Z');
    const long = formatRelative(target, { base, locale: 'en-US', numeric: 'always', style: 'long' });
    const short = formatRelative(target, { base, locale: 'en-US', numeric: 'always', style: 'short' });

    expect(typeof short).toBe('string');
    expect(short.length).toBeLessThanOrEqual(long.length);
  });
});

describe('parseDuration', () => {
  it('parses ISO string', () => {
    expect(parseDuration('PT2H30M').toString()).toBe('PT2H30M');
  });
  it('parses DurationLike', () => {
    expect(parseDuration({ hours: 2, minutes: 30 }).toString()).toBe('PT2H30M');
  });
  it('throws with invalid value in message', () => {
    expect(() => parseDuration('not-a-duration')).toThrow('[tempo] Invalid duration input: "not-a-duration"');
  });
});

describe('formatDuration', () => {
  it('returns a string', () => {
    expect(typeof formatDuration('PT2H30M')).toBe('string');
  });
  it('human-readable fallback when Intl.DurationFormat unavailable', () => {
    const intlRecord = Intl as Record<string, unknown>;
    const saved = intlRecord['DurationFormat'];

    intlRecord['DurationFormat'] = undefined;

    try {
      expect(formatDuration('PT2H30M')).toBe('2 hours, 30 minutes');
      expect(formatDuration({ hours: 1, minutes: 1 })).toBe('1 hour, 1 minute');
      expect(formatDuration({ seconds: 0 })).toBe('0 seconds');
    } finally {
      intlRecord['DurationFormat'] = saved;
    }
  });

  it('fallback renders absolute values for negative duration', () => {
    const intlRecord = Intl as Record<string, unknown>;
    const saved = intlRecord['DurationFormat'];

    intlRecord['DurationFormat'] = undefined;

    try {
      // Negative duration via DurationLike — individual fields are negative
      expect(formatDuration({ hours: -2, minutes: -30 })).toBe('2 hours, 30 minutes');
    } finally {
      intlRecord['DurationFormat'] = saved;
    }
  });
});

describe('formatParts', () => {
  it('returns Intl.DateTimeFormatPart array', () => {
    const parts = formatParts(Temporal.Instant.from('2026-03-21T10:15:30Z'), { pattern: 'date-only', tz: 'UTC' });

    expect(Array.isArray(parts)).toBe(true);
    expect(parts.some((p) => p.type === 'year')).toBe(true);
  });
  it('throws for plain input without tz', () => {
    expect(() => formatParts(parsePlainDateTime('2026-03-21T10:15:30'))).toThrow(MISSING_TZ);
  });
});

describe('expires', () => {
  const T = {
    critical: { days: 3 },
    expired: { days: 0 },
    longExpired: { days: -30 },
    safe: { years: 100 },
    warning: { days: 14 },
  } as const;

  it('classifies a date beyond -30 days as longExpired', () => {
    expect(expires(Temporal.Now.instant().subtract({ hours: 60 * 24 }), T)).toBe('longExpired');
  });
  it('classifies a recently past date as expired', () => {
    expect(expires(Temporal.Now.instant().subtract({ hours: 12 }), T)).toBe('expired');
  });
  it('classifies a date within 3 days as critical', () => {
    expect(expires(Temporal.Now.instant().add({ hours: 48 }), T)).toBe('critical');
  });
  it('classifies a date within 14 days as warning', () => {
    expect(expires(Temporal.Now.instant().add({ hours: 10 * 24 }), T)).toBe('warning');
  });
  it('classifies a far future date as safe', () => {
    expect(expires(Temporal.Now.instant().add({ hours: 60 * 24 }), T)).toBe('safe');
  });
  it('returns null when no threshold matches', () => {
    expect(expires(Temporal.Now.instant().add({ hours: 200 * 24 * 365 }), { critical: { days: 3 } })).toBeNull();
  });
  it('accepts ZonedDateTime', () => {
    expect(expires(Temporal.Now.zonedDateTimeISO('UTC').add({ days: 10 }), T)).toBe('warning');
  });
  it('uses the pinned now param for deterministic classification', () => {
    const pinnedNow = Temporal.Instant.from('2026-06-01T00:00:00Z');
    const threeDaysLater = Temporal.Instant.from('2026-06-04T00:00:00Z');
    const tenDaysLater = Temporal.Instant.from('2026-06-11T00:00:00Z');

    expect(expires(threeDaysLater, T, {}, pinnedNow)).toBe('critical');
    expect(expires(tenDaysLater, T, {}, pinnedNow)).toBe('warning');
  });
  it('requires tz for plain inputs', () => {
    expect(() => expires(parsePlainDateTime('2000-01-01'), T)).toThrow(MISSING_TZ);
  });
  it('accepts plain input with explicit tz', () => {
    expect(expires(parsePlainDateTime('2000-01-01'), T, { tz: 'UTC' })).toBe('longExpired');
  });
  it('works with arbitrary key names', () => {
    const result = expires(Temporal.Now.instant().add({ hours: 2 }), {
      normal: { years: 1 },
      overdue: { days: 0 },
      urgent: { days: 1 },
    });

    expect(result).toBe('urgent');
  });

  it('returns null with pinned now when date exceeds all thresholds', () => {
    const pinnedNow = Temporal.Instant.from('2026-06-01T00:00:00Z');
    const farFuture = Temporal.Instant.from('2200-01-01T00:00:00Z');

    expect(expires(farFuture, { soon: { days: 3 } }, {}, pinnedNow)).toBeNull();
  });
});

describe('timeDiff', () => {
  const base = Temporal.Instant.from('2026-01-01T00:00:00Z');

  it('returns calendar-accurate years with tz', () => {
    const result = timeDiff(base, Temporal.ZonedDateTime.from('2028-06-01T00:00:00[UTC]'), { tz: 'UTC' });

    expect(result.unit).toBe('year');
    expect(result.value).toBe(2);
  });
  it('returns calendar-accurate months with tz', () => {
    const result = timeDiff(base, Temporal.ZonedDateTime.from('2026-06-15T00:00:00[UTC]'), { tz: 'UTC' });

    expect(result.unit).toBe('month');
    expect(result.value).toBe(5);
  });
  it('returns hours between two Instants (no tz needed)', () => {
    const result = timeDiff(base, base.add({ minutes: 7 * 60 + 1 }), { tz: 'UTC' });

    expect(result.unit).toBe('hour');
    expect(result.value).toBe(7);
  });
  it('works for two Instants without any tz option', () => {
    const a = Temporal.Instant.from('2026-01-01T00:00:00Z');
    const b = Temporal.Instant.from('2026-01-03T06:00:00Z');
    const result = timeDiff(a, b);

    expect(result.unit).toBe('day');
    expect(result.value).toBe(2);
  });
  it('returns minutes between two Instants', () => {
    expect(timeDiff(base, base.add({ seconds: 42 * 60 + 1 }), { tz: 'UTC' })).toEqual({ unit: 'minute', value: 42 });
  });
  it('returns seconds', () => {
    expect(timeDiff(base, base.add({ seconds: 10 }), { tz: 'UTC' })).toEqual({ unit: 'second', value: 10 });
  });
  it('is symmetric', () => {
    const result = timeDiff(Temporal.ZonedDateTime.from('2026-06-15T00:00:00[UTC]'), base, { tz: 'UTC' });

    expect(result.unit).toBe('month');
    expect(result.value).toBe(5);
  });
  it('defaults b to now when omitted and uses Instant fast path', () => {
    const result = timeDiff(Temporal.Now.instant().subtract({ hours: 2 }));

    expect(result.unit).toBe('hour');
    expect(result.value).toBe(2);
  });
  it('returns milliseconds for sub-second diff', () => {
    expect(timeDiff(base, base.add({ milliseconds: 400 }), { tz: 'UTC' })).toEqual({ unit: 'millisecond', value: 400 });
  });
  it('returns milliseconds for zero diff', () => {
    expect(timeDiff(base, base, { tz: 'UTC' })).toEqual({ unit: 'millisecond', value: 0 });
  });
  it('returns seconds for exactly 1000ms', () => {
    expect(timeDiff(base, base.add({ milliseconds: 1000 }), { tz: 'UTC' })).toEqual({ unit: 'second', value: 1 });
  });
  it('returns days for multi-day span between two Instants', () => {
    // 74h = 3d 2h — calendar-accurate with tz
    expect(timeDiff(base, base.add({ hours: 74 }), { tz: 'UTC' })).toEqual({ unit: 'day', value: 3 });
  });
  it('requires tz for plain inputs (throws without tz)', () => {
    expect(() => timeDiff(parsePlainDateTime('2026-01-01'), parsePlainDateTime('2026-04-01'))).toThrow(MISSING_TZ);
  });

  it('works with PlainDate inputs and explicit tz', () => {
    const a = parsePlainDate('2026-01-01');
    const b = parsePlainDate('2026-03-01');
    const result = timeDiff(a, b, { tz: 'UTC' });

    expect(result.unit).toBe('month');
    expect(result.value).toBe(2);
  });
  it('throws a [tempo] error for an invalid timezone', () => {
    expect(() => timeDiff(base, Temporal.ZonedDateTime.from('2026-06-01T00:00:00[UTC]'), { tz: 'Foo/Bar' })).toThrow(
      '[tempo] Unknown or invalid timezone: "Foo/Bar"',
    );
  });
});

describe('dateRange', () => {
  const opts = { tz: 'UTC' };

  it('infers tz from ZonedDateTime inputs without explicit options', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[America/New_York]');
    const end = Temporal.ZonedDateTime.from('2022-01-03T00:00:00[America/New_York]');
    const result = [...dateRange(start, end, { days: 1 })];

    expect(result).toHaveLength(3);
    expect(result[0].timeZoneId).toBe('America/New_York');
  });
  it('re-projects end into start tz when they differ', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    // Same instant as 2022-01-01T00:00:00Z but expressed in Berlin (+01:00 in winter)
    const end = Temporal.ZonedDateTime.from('2022-01-03T01:00:00[Europe/Berlin]');
    const result = [...dateRange(start, end, { days: 1 })];

    // All yielded values should be in start's timezone (UTC)
    expect(result.every((d) => d.timeZoneId === 'UTC')).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('generates daily range lazily via spread', () => {
    const result = [
      ...dateRange(
        Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]'),
        Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]'),
        { days: 1 },
        opts,
      ),
    ];

    expect(result).toHaveLength(5);
    expect(result[0].day).toBe(1);
    expect(result[4].day).toBe(5);
  });
  it('supports early bailout with for...of break', () => {
    const collected: Temporal.ZonedDateTime[] = [];

    for (const d of dateRange(
      Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]'),
      Temporal.ZonedDateTime.from('2022-12-31T00:00:00[UTC]'),
      { days: 1 },
      opts,
    )) {
      collected.push(d);

      if (collected.length === 3) break;
    }
    expect(collected).toHaveLength(3);
  });
  it('returns no items when start is after end', () => {
    expect([
      ...dateRange(
        Temporal.ZonedDateTime.from('2022-12-01T00:00:00[UTC]'),
        Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]'),
        { days: 1 },
        opts,
      ),
    ]).toEqual([]);
  });
  it('accepts PlainDate with explicit tz', () => {
    expect([...dateRange(parsePlainDate('2022-03-01'), parsePlainDate('2022-03-03'), { days: 1 }, opts)]).toHaveLength(
      3,
    );
  });
  it('throws RangeError for zero or negative step', () => {
    const start = Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]');

    expect(() => [...dateRange(start, end, { days: 0 }, opts)]).toThrow(RangeError);
    expect(() => [...dateRange(start, end, { days: -1 }, opts)]).toThrow('step must advance the date forward');
  });

  it('yields exactly one item when start equals end', () => {
    const d = Temporal.ZonedDateTime.from('2026-03-15T00:00:00[UTC]');

    expect([...dateRange(d, d, { days: 1 }, opts)]).toHaveLength(1);
  });
});

describe('expires + timeDiff composition', () => {
  const T = {
    critical: { days: 3 },
    expired: { days: 0 },
    safe: { years: 100 },
    warning: { days: 14 },
  } as const;

  it('composes expires+timeDiff to get key and diff (future date within critical window)', () => {
    const pinnedNow = parseInstant('2026-06-01T00:00:00Z');
    const date = parseInstant('2026-06-02T12:00:00Z');
    const key = expires(date, T, {}, pinnedNow);
    const diff = timeDiff(date, pinnedNow, { tz: 'UTC' });

    expect(key).toBe('critical');
    expect(['day', 'hour']).toContain(diff.unit);
    expect(diff.value).toBeGreaterThan(0);
  });

  it('returns null key when no threshold matches', () => {
    const date = Temporal.Now.instant().add({ hours: 200 * 24 * 365 });

    expect(expires(date, { critical: { days: 3 } })).toBeNull();
  });

  it('key is expired and diff shows hours for past dates', () => {
    const pinnedNow = parseInstant('2026-06-01T12:00:00Z');
    const date = parseInstant('2026-06-01T00:00:00Z');
    const key = expires(date, T, {}, pinnedNow);
    const diff = timeDiff(date, pinnedNow, { tz: 'UTC' });

    expect(key).toBe('expired');
    expect(diff.unit).toBe('hour');
    expect(diff.value).toBe(12);
  });

  it('accepts ZonedDateTime without explicit tz', () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({ days: 10 });

    expect(expires(date, T)).toBe('warning');
  });

  it('requires tz for plain inputs (timeDiff)', () => {
    expect(() => timeDiff(parsePlainDateTime('2000-01-01'), parsePlainDateTime('2000-04-01'))).toThrow(MISSING_TZ);
  });

  it('pinned now ensures expires and timeDiff are consistent', () => {
    const pinnedNow = parseInstant('2026-06-01T00:00:00Z');
    const threeDaysLater = parseInstant('2026-06-04T00:00:00Z');

    expect(expires(threeDaysLater, T, {}, pinnedNow)).toBe('critical');
    expect(timeDiff(threeDaysLater, pinnedNow, { tz: 'UTC' }).value).toBeGreaterThan(0);
  });
});

describe('recurrence', () => {
  const opts = { tz: 'UTC' };

  it('infers tz from ZonedDateTime start without explicit options', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[America/New_York]');
    const result = [...recurrence(start, { count: 3, frequency: 'daily' })];

    expect(result).toHaveLength(3);
    expect(result[0].timeZoneId).toBe('America/New_York');
  });
  it('respects until boundary when tz is inferred from ZonedDateTime start', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const until = Temporal.ZonedDateTime.from('2026-01-03T00:00:00[UTC]');
    const result = [...recurrence(start, { frequency: 'daily', until })];

    expect(result).toHaveLength(3);
    expect(result[2].day).toBe(3);
  });

  it('generates daily occurrences', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 3, frequency: 'daily' }, opts)];

    expect(result).toHaveLength(3);
    expect(result[0].day).toBe(1);
    expect(result[1].day).toBe(2);
    expect(result[2].day).toBe(3);
  });

  it('generates weekly occurrences', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 4, frequency: 'weekly' }, opts)];

    expect(result).toHaveLength(4);
    expect(result[1].day).toBe(8);
    expect(result[2].day).toBe(15);
  });

  it('generates monthly occurrences', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-15T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 3, frequency: 'monthly' }, opts)];

    expect(result).toHaveLength(3);
    expect(result[0].month).toBe(1);
    expect(result[1].month).toBe(2);
    expect(result[2].month).toBe(3);
  });

  it('generates yearly occurrences', () => {
    const start = Temporal.ZonedDateTime.from('2026-06-01T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 3, frequency: 'yearly' }, opts)];

    expect(result).toHaveLength(3);
    expect(result[0].year).toBe(2026);
    expect(result[1].year).toBe(2027);
    expect(result[2].year).toBe(2028);
  });

  it('respects count limit', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');

    expect([...recurrence(start, { count: 5, frequency: 'daily' }, opts)]).toHaveLength(5);
  });

  it('respects until boundary (inclusive)', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const until = Temporal.ZonedDateTime.from('2026-01-05T00:00:00[UTC]');
    const result = [...recurrence(start, { frequency: 'daily', until }, opts)];

    expect(result).toHaveLength(5);
    expect(result[4].day).toBe(5);
  });

  it('supports interval', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 3, frequency: 'weekly', interval: 2 }, opts)];

    expect(result[0].day).toBe(1);
    expect(result[1].day).toBe(15);
    expect(result[2].day).toBe(29);
  });

  it('supports early bailout with for...of break', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const collected: Temporal.ZonedDateTime[] = [];

    for (const d of recurrence(start, { count: 100, frequency: 'daily' }, opts)) {
      collected.push(d);

      if (collected.length === 3) break;
    }

    expect(collected).toHaveLength(3);
  });

  it('type union enforces count or until at compile time (no runtime guard needed)', () => {
    // R10: runtime guard removed; type union RecurrenceRule already prevents neither count nor until.
    // This test documents the design decision: the guard is at the type level.
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const rule: RecurrenceRule = { count: 1, frequency: 'daily' };

    expect(() => [...recurrence(start, rule, opts)]).not.toThrow();
  });

  it('accepts Instant start with explicit tz', () => {
    const start = Temporal.Instant.from('2026-01-01T00:00:00Z');
    const result = [...recurrence(start, { count: 2, frequency: 'daily' }, opts)];

    expect(result).toHaveLength(2);
    expect(result[0].timeZoneId).toBe('UTC');
  });

  it('yields nothing when count is 0', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 0, frequency: 'daily' }, opts)];

    expect(result).toHaveLength(0);
  });

  it('stops at count when both count and until are provided and count elapses first', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const until = Temporal.ZonedDateTime.from('2026-12-31T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 3, frequency: 'daily', until }, opts)];

    expect(result).toHaveLength(3);
  });

  it('stops at until when both count and until are provided and until elapses first', () => {
    const start = Temporal.ZonedDateTime.from('2026-01-01T00:00:00[UTC]');
    const until = Temporal.ZonedDateTime.from('2026-01-02T00:00:00[UTC]');
    const result = [...recurrence(start, { count: 100, frequency: 'daily', until }, opts)];

    expect(result).toHaveLength(2);
    expect(result[1].day).toBe(2);
  });
});

describe('formatRangeParts', () => {
  it('returns a non-empty parts array', () => {
    const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');
    const parts = formatRangeParts(start, end, { locale: 'en-US', pattern: 'short', tz: 'UTC' });

    expect(Array.isArray(parts)).toBe(true);
    expect(parts.length).toBeGreaterThan(0);
  });

  it('parts have type and value fields', () => {
    const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
    const end = Temporal.Instant.from('2026-03-21T12:00:00Z');
    const parts = formatRangeParts(start, end, { pattern: 'short', tz: 'UTC' });

    for (const part of parts) {
      expect(typeof part.type).toBe('string');
      expect(typeof part.value).toBe('string');
    }
  });

  it('throws for mismatched ZonedDateTime timezones', () => {
    const ny = Temporal.ZonedDateTime.from('2026-03-21T10:00:00-04:00[America/New_York]');
    const berlin = Temporal.ZonedDateTime.from('2026-03-21T16:00:00+01:00[Europe/Berlin]');

    expect(() => formatRangeParts(ny, berlin)).toThrow(
      '[tempo] formatRangeParts received ZonedDateTime inputs with different time zones.',
    );
  });

  it('infers timezone from ZonedDateTime', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]');
    const end = Temporal.ZonedDateTime.from('2026-03-21T12:00:00+00:00[UTC]');
    const parts = formatRangeParts(start, end, { pattern: 'time-only' });

    expect(parts.length).toBeGreaterThan(0);
  });
});

describe('parse', () => {
  it('parses a ZonedDateTime string (auto-detect)', () => {
    const result = parse('2026-03-21T11:00:00+01:00[Europe/Berlin]');

    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((result as Temporal.ZonedDateTime).timeZoneId).toBe('Europe/Berlin');
  });

  it('parses an Instant string (auto-detect)', () => {
    expect(parse('2026-03-21T10:00:00Z')).toBeInstanceOf(Temporal.Instant);
  });

  it('parses a PlainDateTime string (auto-detect)', () => {
    expect(parse('2026-03-21T10:00:00')).toBeInstanceOf(Temporal.PlainDateTime);
  });

  it('parses a PlainDate string (auto-detect)', () => {
    expect(parse('2026-03-21')).toBeInstanceOf(Temporal.PlainDate);
  });

  it('parses with as="zoned" returning ZonedDateTime', () => {
    const result = parse('2026-03-21T11:00:00+01:00[Europe/Berlin]', 'zoned');

    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(result.timeZoneId).toBe('Europe/Berlin');
  });

  it('parses with as="instant" returning Instant', () => {
    expect(parse('2026-03-21T10:00:00Z', 'instant')).toBeInstanceOf(Temporal.Instant);
  });

  it('parses with as="plain-datetime" returning PlainDateTime', () => {
    expect(parse('2026-03-21T10:00:00', 'plain-datetime')).toBeInstanceOf(Temporal.PlainDateTime);
  });

  it('parses with as="plain-date" returning PlainDate', () => {
    expect(parse('2026-03-21', 'plain-date')).toBeInstanceOf(Temporal.PlainDate);
  });

  it('throws a descriptive error for an invalid string', () => {
    expect(() => parse('not-a-date')).toThrow('[tempo] Unable to parse date/time string: "not-a-date"');
  });

  it('throws when as="zoned" but string is not a zoned datetime (C2)', () => {
    expect(() => parse('2026-03-21', 'zoned')).toThrow('[tempo] Invalid zoned date-time string');
  });

  it('throws when as="instant" but string is not an instant (C2)', () => {
    expect(() => parse('not-an-instant', 'instant')).toThrow('[tempo] Invalid instant string');
  });

  it('throws when as="plain-datetime" but string is invalid (C2)', () => {
    expect(() => parse('not-a-date', 'plain-datetime')).toThrow('[tempo] Invalid date/time string');
  });

  it('throws when as="plain-date" but string is invalid (C2)', () => {
    expect(() => parse('not-a-date', 'plain-date')).toThrow('[tempo] Invalid plain date string');
  });
});

describe('TempoError (E1)', () => {
  it('errors thrown by tempo are instanceof TempoError', () => {
    expect(() => parse('not-a-date')).toThrow(TempoError);
  });

  it('errors thrown by tempo are instanceof TypeError (backward compat)', () => {
    expect(() => parse('not-a-date')).toThrow(TypeError);
  });

  it('.name is "TempoError"', () => {
    try {
      parse('not-a-date');
    } catch (e) {
      expect((e as TempoError).name).toBe('TempoError');
    }
  });

  it('.code is INVALID_INPUT for parse errors', () => {
    try {
      parse('not-a-date');
    } catch (e) {
      expect((e as TempoError).code).toBe(TempoErrorCode.INVALID_INPUT);
    }
  });

  it('.code is MISSING_TZ for missing timezone errors', () => {
    try {
      toInstant(parsePlainDateTime('2026-03-21T10:00:00'));
    } catch (e) {
      expect((e as TempoError).code).toBe(TempoErrorCode.MISSING_TZ);
    }
  });

  it('.code is INVALID_TZ for bad timezone errors', () => {
    try {
      inTz(Temporal.Instant.from('2026-03-21T10:00:00Z'), 'Bad/Zone');
    } catch (e) {
      expect((e as TempoError).code).toBe(TempoErrorCode.INVALID_TZ);
    }
  });

  it('TempoErrorCode constants match expected strings', () => {
    expect(TempoErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(TempoErrorCode.INVALID_TZ).toBe('INVALID_TZ');
    expect(TempoErrorCode.MISSING_TZ).toBe('MISSING_TZ');
    expect(TempoErrorCode.UNSUPPORTED_INPUT).toBe('UNSUPPORTED_INPUT');
  });
});

describe('isValid', () => {
  it('returns true for Temporal.Instant', () => {
    expect(isValid(Temporal.Instant.from('2026-03-21T10:00:00Z'))).toBe(true);
  });

  it('returns true for Temporal.ZonedDateTime', () => {
    expect(isValid(Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]'))).toBe(true);
  });

  it('returns true for Temporal.PlainDateTime', () => {
    expect(isValid(Temporal.PlainDateTime.from('2026-03-21T10:00:00'))).toBe(true);
  });

  it('returns true for Temporal.PlainDate', () => {
    expect(isValid(Temporal.PlainDate.from('2026-03-21'))).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isValid('2026-03-21')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isValid(null)).toBe(false);
    expect(isValid(undefined)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isValid(1711015200000)).toBe(false);
  });
});

describe('humanize', () => {
  it('formats singular day', () => {
    expect(humanize({ unit: 'day', value: 1 })).toBe('1 day');
  });

  it('formats plural days', () => {
    expect(humanize({ unit: 'day', value: 3 })).toBe('3 days');
  });

  it('formats singular hour', () => {
    expect(humanize({ unit: 'hour', value: 1 })).toBe('1 hour');
  });

  it('formats plural hours', () => {
    expect(humanize({ unit: 'hour', value: 7 })).toBe('7 hours');
  });

  it('formats zero milliseconds', () => {
    expect(humanize({ unit: 'millisecond', value: 0 })).toBe('0 milliseconds');
  });

  it('formats singular millisecond', () => {
    expect(humanize({ unit: 'millisecond', value: 1 })).toBe('1 millisecond');
  });

  it('formats year/month/week/minute/second units', () => {
    expect(humanize({ unit: 'year', value: 2 })).toBe('2 years');
    expect(humanize({ unit: 'month', value: 1 })).toBe('1 month');
    expect(humanize({ unit: 'week', value: 4 })).toBe('4 weeks');
    expect(humanize({ unit: 'minute', value: 30 })).toBe('30 minutes');
    expect(humanize({ unit: 'second', value: 1 })).toBe('1 second');
  });
  it('formats singular week', () => {
    expect(humanize({ unit: 'week', value: 1 })).toBe('1 week');
  });

  it('localizes the number when locale is provided', () => {
    // Arabic locale uses Eastern Arabic numerals
    const result = humanize({ unit: 'day', value: 3 }, { locale: 'ar-EG' });

    expect(result).toMatch(/day/);
    expect(result).not.toMatch(/^3/);
  });

  it('leaves number as-is when no locale is provided', () => {
    expect(humanize({ unit: 'day', value: 3 })).toBe('3 days');
  });
});

describe('difference — rounding options (C1)', () => {
  it('rounds up to next hour with roundingMode: ceil and smallestUnit: hour', () => {
    const start = parseInstant('2026-01-01T00:00:00Z');
    const end = parseInstant('2026-01-01T01:30:00Z');
    const dur = difference(start, end, { roundingMode: 'ceil', smallestUnit: 'hour' });

    expect(dur.hours).toBe(2);
  });

  it('rounds to nearest 30 minutes with roundingIncrement and smallestUnit: minute', () => {
    const start = parseInstant('2026-01-01T00:00:00Z');
    const end = parseInstant('2026-01-01T00:20:00Z');
    const dur = difference(start, end, { roundingIncrement: 30, smallestUnit: 'minute' });

    expect(dur.minutes).toBe(0);
  });
});

describe('validateTz — UTC offset strings (C2)', () => {
  it('accepts a UTC numeric offset string like "+05:30"', () => {
    const plain = parsePlainDateTime('2026-03-21T10:00:00');

    expect(() => toInstant(plain, { tz: '+05:30' })).not.toThrow();
  });

  it('throws a descriptive [tempo] error for an unrecognised timezone string', () => {
    const plain = parsePlainDateTime('2026-03-21T10:00:00');

    expect(() => toInstant(plain, { tz: 'Not/ATimezone' })).toThrow('[tempo] Unknown or invalid timezone');
  });
});

describe('formatRelative — ZonedDateTime base (C3)', () => {
  it('accepts a ZonedDateTime as the base option', () => {
    const base = Temporal.ZonedDateTime.from('2026-03-21T10:00:00+00:00[UTC]');
    const input = Temporal.ZonedDateTime.from('2026-03-21T12:00:00+00:00[UTC]');
    const result = formatRelative(input, { base, locale: 'en-US', numeric: 'always' });

    expect(result).toMatch(/2 hour/);
  });
});

describe('inTz — cross-timezone re-projection (C4)', () => {
  it('re-projects a ZonedDateTime into a different timezone preserving the absolute instant', () => {
    const berlin = parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]');
    const utc = inTz(berlin, 'UTC');

    expect(utc.timeZoneId).toBe('UTC');
    expect(utc.hour).toBe(10);
    expect(utc.toInstant().epochMilliseconds).toBe(berlin.toInstant().epochMilliseconds);
  });
});

describe('clamp — unit option returns floor of boundary (C5)', () => {
  it('returns start-of-day instant for a value inside the range when unit is day', () => {
    const wednesday = parseZoned('2026-03-18T15:30:00+00:00[UTC]');
    const monday = parseZoned('2026-03-16T00:00:00+00:00[UTC]');
    const friday = parseZoned('2026-03-20T00:00:00+00:00[UTC]');
    const clamped = clamp(wednesday, monday, friday, { tz: 'UTC', unit: 'day' });
    const expectedFloor = startOf(wednesday, 'day', { tz: 'UTC' });

    expect(clamped.epochMilliseconds).toBe(expectedFloor.toInstant().epochMilliseconds);
  });
});

describe('formatDuration — fallback handles microseconds and nanoseconds (B2)', () => {
  it('includes microseconds in the fallback string when Intl.DurationFormat is unavailable', () => {
    const IntlAny = Intl as Record<string, unknown>;
    const saved = IntlAny['DurationFormat'];

    IntlAny['DurationFormat'] = undefined;

    try {
      const result = formatDuration({ microseconds: 500 });

      expect(result).toContain('500 microseconds');
    } finally {
      IntlAny['DurationFormat'] = saved;
    }
  });

  it('includes nanoseconds in the fallback string when Intl.DurationFormat is unavailable', () => {
    const IntlAny = Intl as Record<string, unknown>;
    const saved = IntlAny['DurationFormat'];

    IntlAny['DurationFormat'] = undefined;

    try {
      const result = formatDuration({ nanoseconds: 1 });

      expect(result).toContain('1 nanosecond');
    } finally {
      IntlAny['DurationFormat'] = saved;
    }
  });

  it('returns "0 seconds" for a zero duration when Intl.DurationFormat is unavailable', () => {
    const IntlAny = Intl as Record<string, unknown>;
    const saved = IntlAny['DurationFormat'];

    IntlAny['DurationFormat'] = undefined;

    try {
      expect(formatDuration({ nanoseconds: 0 })).toBe('0 seconds');
    } finally {
      IntlAny['DurationFormat'] = saved;
    }
  });
});
