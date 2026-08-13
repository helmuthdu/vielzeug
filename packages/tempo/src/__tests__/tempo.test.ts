import { describe, expect, it } from 'vitest';

import {
  clamp,
  classifyExpiry,
  contains,
  dateRange,
  difference,
  format,
  formatInstant,
  inTimeZone,
  isAfter,
  isBefore,
  isSame,
  now,
  parse,
  recurrence,
  shift,
  TempoInvalidInputError,
  TempoMissingTzError,
  Temporal,
  toInstant,
} from '../index';

describe('parse', () => {
  it.each([
    ['instant', '2026-03-21T10:15:30Z', '2026-03-21T10:15:30Z'],
    ['plainDate', '2026-03-21', '2026-03-21'],
    ['plainDateTime', '2026-03-21T10:15:30', '2026-03-21T10:15:30'],
    ['zonedDateTime', '2026-03-21T11:15:30+01:00[Europe/Berlin]', '2026-03-21T11:15:30+01:00[Europe/Berlin]'],
  ] as const)('parses a %s explicitly', (as, input, expected) => {
    expect(parse(input, { as }).toString()).toBe(expected);
  });

  it('rejects a mismatched ISO string', () => {
    expect(() => parse('2026-03-21', { as: 'instant' })).toThrow(TempoInvalidInputError);
  });
});

describe('time zone resolution', () => {
  it('requires timeZone for wall time conversion', () => {
    const wall = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });

    expect(() => toInstant(wall)).toThrow(TempoMissingTzError);
    expect(toInstant(wall, { timeZone: 'Europe/Berlin' }).toString()).toBe('2026-03-21T09:15:30Z');
  });

  it('uses Temporal terminology for DST disambiguation', () => {
    const wall = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });

    expect(toInstant(wall, { disambiguation: 'earlier', timeZone: 'America/New_York' }).toString()).toBe(
      '2026-11-01T05:30:00Z',
    );
    expect(toInstant(wall, { disambiguation: 'later', timeZone: 'America/New_York' }).toString()).toBe(
      '2026-11-01T06:30:00Z',
    );
  });

  it('projects an instant with inTimeZone', () => {
    const instant = parse('2026-03-21T10:00:00Z', { as: 'instant' });

    expect(inTimeZone(instant, 'Europe/Berlin').toString()).toBe('2026-03-21T11:00:00+01:00[Europe/Berlin]');
    expect(now({ timeZone: 'UTC' }).timeZoneId).toBe('UTC');
  });
});

describe('arithmetic and comparisons', () => {
  const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
  const middle = parse('2026-03-21T11:00:00Z', { as: 'instant' });
  const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });

  it('uses object input for differences', () => {
    expect(difference({ end, largestUnit: 'hour', start }).toString()).toBe('PT2H');
  });

  it('uses object input for containment and clamping', () => {
    expect(contains({ end, start, value: middle })).toBe(true);
    expect(clamp({ end, start, value: parse('2026-03-21T13:00:00Z', { as: 'instant' }) }).toString()).toBe(
      '2026-03-21T12:00:00Z',
    );
  });

  it('keeps simple pair comparisons positional', () => {
    expect(isBefore(start, middle)).toBe(true);
    expect(isAfter(end, middle)).toBe(true);
    expect(isSame(start, start)).toBe(true);
  });

  it('preserves DST-safe shifting', () => {
    const before = parse('2026-03-08T01:30:00-05:00[America/New_York]', { as: 'zonedDateTime' });

    expect(shift(before, { hours: 1 }).toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
  });
});

describe('expiry classification', () => {
  const reference = parse('2026-06-01T00:00:00Z', { as: 'instant' });

  it('classifies fixed elapsed-time thresholds', () => {
    expect(
      classifyExpiry({
        relativeTo: reference,
        thresholds: { expired: { days: 0 }, warning: { days: 7 } },
        value: parse('2026-06-04T00:00:00Z', { as: 'instant' }),
      }),
    ).toBe('warning');
  });

  it('rejects calendar months and years rather than approximating them', () => {
    expect(() =>
      classifyExpiry({
        relativeTo: reference,
        thresholds: { invalid: { months: 1 } },
        value: reference,
      }),
    ).toThrow(TempoInvalidInputError);
  });
});

describe('calendar sequences', () => {
  it('yields an inclusive zoned date range', () => {
    const start = parse('2026-03-01T00:00:00[UTC]', { as: 'zonedDateTime' });
    const end = parse('2026-03-03T00:00:00[UTC]', { as: 'zonedDateTime' });

    expect([...dateRange(start, end, { days: 1 })].map((value) => value.day)).toEqual([1, 2, 3]);
  });

  it('requires an advancing date range step', () => {
    const start = parse('2026-03-01T00:00:00[UTC]', { as: 'zonedDateTime' });

    expect(() => dateRange(start, start, { days: 0 })).toThrow(TempoInvalidInputError);
  });

  it('limits recurrence by count', () => {
    const start = parse('2026-03-01T00:00:00[UTC]', { as: 'zonedDateTime' });

    expect([...recurrence(start, { count: 3, frequency: 'weekly' })]).toHaveLength(3);
  });
});

describe('formatting', () => {
  it('uses timeZone instead of tz', () => {
    const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });

    expect(format(instant, { locale: 'en-GB', pattern: 'short', timeZone: 'UTC' })).toBe('21/03/2026, 10:15');
    expect(formatInstant(instant)).toBe('2026-03-21T10:15:30Z');
  });

  it('keeps Temporal re-export available for package-wide type identity', () => {
    expect(Temporal.Instant.from('2026-03-21T10:00:00Z')).toBeInstanceOf(Temporal.Instant);
  });
});
