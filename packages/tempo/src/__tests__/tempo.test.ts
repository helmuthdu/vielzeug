import { describe, expect, it } from 'vitest';

import {
  difference,
  endOf,
  format,
  formatDuration,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatTimer,
  formatZoned,
  isAfter,
  isBefore,
  isSame,
  isValid,
  now,
  type ParseAs,
  parse,
  parseDuration,
  shift,
  startOf,
  TempoInvalidInputError,
  TempoInvalidTzError,
  TempoMissingTzError,
  Temporal,
  toInstant,
  toZoned,
} from '../index';

describe('parse', () => {
  it.each([
    ['instant', '2026-03-21T10:15:30Z', '2026-03-21T10:15:30Z'],
    ['plainDate', '2026-03-21', '2026-03-21'],
    ['plainDateTime', '2026-03-21T10:15:30', '2026-03-21T10:15:30'],
    ['zonedDateTime', '2026-03-21T11:15:30+01:00[Europe/Berlin]', '2026-03-21T11:15:30+01:00[Europe/Berlin]'],
  ] as Array<[ParseAs, string, string]>)('parses a %s explicitly', (as, input, expected) => {
    expect(
      (parse as (input: string, options: { as: ParseAs }) => { toString(): string })(input, { as }).toString(),
    ).toBe(expected);
  });

  it('rejects a mismatched ISO string', () => {
    expect(() => parse('2026-03-21', { as: 'instant' })).toThrow(TempoInvalidInputError);
  });

  it('preserves the original Temporal error as cause', () => {
    expect.assertions(2);

    try {
      parse('not-a-date', { as: 'instant' });
    } catch (err) {
      expect(err).toBeInstanceOf(TempoInvalidInputError);
      expect((err as Error).cause).toBeInstanceOf(Error);
    }
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

  it('projects an instant with toZoned', () => {
    const instant = parse('2026-03-21T10:00:00Z', { as: 'instant' });

    expect(toZoned(instant, { timeZone: 'Europe/Berlin' }).toString()).toBe('2026-03-21T11:00:00+01:00[Europe/Berlin]');
    expect(now({ timeZone: 'UTC' }).timeZoneId).toBe('UTC');
  });

  it('round-trips a wall time through toInstant and toZoned', () => {
    const wall = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });

    expect(toZoned(toInstant(wall, { timeZone: 'Europe/Berlin' }), { timeZone: 'Europe/Berlin' }).toString()).toBe(
      '2026-03-21T10:15:30+01:00[Europe/Berlin]',
    );
  });

  it('preserves the original error as cause for invalid timezone', () => {
    expect.assertions(2);

    try {
      now({ timeZone: 'Not/A_Real_Zone' });
    } catch (err) {
      expect(err).toBeInstanceOf(TempoInvalidTzError);
      expect((err as Error).cause).toBeInstanceOf(Error);
    }
  });
});

describe('arithmetic and comparisons', () => {
  const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
  const middle = parse('2026-03-21T11:00:00Z', { as: 'instant' });
  const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });

  it('calculates differences with named inputs', () => {
    expect(difference({ end, largestUnit: 'hour', start }).toString()).toBe('PT2H');
  });

  it('compares wall times in an explicit timezone and unit', () => {
    const morning = parse('2026-03-21T10:00:00', { as: 'plainDateTime' });
    const evening = parse('2026-03-21T20:00:00', { as: 'plainDateTime' });

    expect(isSame(morning, evening, { timeZone: 'Europe/Berlin', unit: 'day' })).toBe(true);
    expect(isBefore(start, middle)).toBe(true);
    expect(isAfter(end, middle)).toBe(true);
  });

  it('shifts Instant input through calendar rules in an explicit timezone', () => {
    const before = parse('2026-03-08T06:30:00Z', { as: 'instant' });

    expect(shift(before, { days: 1 }, { timeZone: 'America/New_York' }).toString()).toBe(
      '2026-03-09T01:30:00-04:00[America/New_York]',
    );
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

describe('isValid', () => {
  it('returns true for Temporal types', () => {
    expect(isValid(parse('2026-03-21T10:00:00Z', { as: 'instant' }))).toBe(true);
    expect(isValid(parse('2026-03-21', { as: 'plainDate' }))).toBe(true);
    expect(isValid(parse('2026-03-21T10:00:00', { as: 'plainDateTime' }))).toBe(true);
    expect(isValid(parse('2026-03-21T10:00:00[UTC]', { as: 'zonedDateTime' }))).toBe(true);
  });

  it('returns false for non-Temporal values', () => {
    expect(isValid('2026-03-21')).toBe(false);
    expect(isValid(new Date())).toBe(false);
    expect(isValid(null)).toBe(false);
    expect(isValid(123)).toBe(false);
  });
});

describe('startOf / endOf', () => {
  const zoned = parse('2026-03-21T10:15:30.500[UTC]', { as: 'zonedDateTime' });

  it.each([
    ['minute', '2026-03-21T10:15:00+00:00[UTC]'],
    ['hour', '2026-03-21T10:00:00+00:00[UTC]'],
    ['day', '2026-03-21T00:00:00+00:00[UTC]'],
    ['month', '2026-03-01T00:00:00+00:00[UTC]'],
    ['year', '2026-01-01T00:00:00+00:00[UTC]'],
  ] as const)('floors to the start of a %s', (unit, expected) => {
    expect(startOf(zoned, unit).toString()).toBe(expected);
  });

  it('returns the last nanosecond of a unit', () => {
    expect(endOf(zoned, 'day').toString()).toBe('2026-03-21T23:59:59.999999999+00:00[UTC]');
  });

  it('respects configurable week starts', () => {
    // 2026-03-21 is a Saturday (dayOfWeek = 6). Week starting Monday (1) → 2026-03-16.
    expect(startOf(zoned, 'week', { weekStartsOn: 1 }).toString()).toBe('2026-03-16T00:00:00+00:00[UTC]');
    // Week starting Sunday (7) → 2026-03-15.
    expect(startOf(zoned, 'week', { weekStartsOn: 7 }).toString()).toBe('2026-03-15T00:00:00+00:00[UTC]');
  });

  it('infers timeZone from ZonedDateTime input', () => {
    const berlin = parse('2026-03-21T10:15:30[Europe/Berlin]', { as: 'zonedDateTime' });

    expect(startOf(berlin, 'day').toString()).toBe('2026-03-21T00:00:00+01:00[Europe/Berlin]');
  });

  it('requires timeZone for wall time input', () => {
    const wall = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });

    expect(() => startOf(wall, 'day')).toThrow(TempoMissingTzError);
  });
});

describe('formatRange / formatRangeParts', () => {
  const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
  const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });

  it('formats a range with a pattern', () => {
    expect(formatRange(start, end, { locale: 'en-GB', pattern: 'short', timeZone: 'UTC' })).toBe(
      '21/03/2026, 10:00–12:00',
    );
  });

  it('returns parts for custom rendering', () => {
    const parts = formatRangeParts(start, end, { locale: 'en-US', pattern: 'short', timeZone: 'UTC' });

    expect(parts.some((p) => p.source === 'startRange')).toBe(true);
    expect(parts.some((p) => p.source === 'endRange')).toBe(true);
  });
});

describe('formatZoned', () => {
  it('serializes a ZonedDateTime with inferred timeZone', () => {
    const zoned = parse('2026-03-21T11:15:30+01:00[Europe/Berlin]', { as: 'zonedDateTime' });

    expect(formatZoned(zoned)).toBe('2026-03-21T11:15:30+01:00[Europe/Berlin]');
  });

  it('converts an Instant with explicit timeZone', () => {
    const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });

    expect(formatZoned(instant, { timeZone: 'Europe/Berlin' })).toBe('2026-03-21T11:15:30+01:00[Europe/Berlin]');
  });

  it('throws TempoMissingTzError for Instant without timeZone', () => {
    const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });

    expect(() => formatZoned(instant)).toThrow(TempoMissingTzError);
  });
});

describe('formatRelative', () => {
  it('formats a future time difference', () => {
    const base = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const target = parse('2026-03-21T12:00:00Z', { as: 'instant' });

    expect(formatRelative(target, { base, locale: 'en-US' })).toBe('in 2 hours');
  });

  it('formats a past time difference', () => {
    const base = parse('2026-03-21T12:00:00Z', { as: 'instant' });
    const target = parse('2026-03-21T10:00:00Z', { as: 'instant' });

    expect(formatRelative(target, { base, locale: 'en-US' })).toBe('2 hours ago');
  });

  it('uses ZonedDateTime input', () => {
    const base = parse('2026-03-21T10:00:00[UTC]', { as: 'zonedDateTime' });
    const target = parse('2026-03-21T10:30:00[UTC]', { as: 'zonedDateTime' });

    expect(formatRelative(target, { base, locale: 'en-US' })).toBe('in 30 minutes');
  });

  it('uses weeks for differences beyond a day', () => {
    const base = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const target = parse('2026-03-28T10:00:00Z', { as: 'instant' });

    // numeric: 'auto' renders 1 as "next" rather than "in 1"
    expect(formatRelative(target, { base, locale: 'en-US' })).toBe('next week');
  });

  it('formats complete calendar months and years without elapsed-time approximation', () => {
    const base = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const nextMonth = parse('2026-04-21T10:00:00Z', { as: 'instant' });
    const nextDecade = parse('2036-03-21T10:00:00Z', { as: 'instant' });
    const previousDecade = parse('2016-03-21T10:00:00Z', { as: 'instant' });

    expect(formatRelative(nextMonth, { base, locale: 'en-US', numeric: 'always', timeZone: 'UTC' })).toBe('in 1 month');
    expect(formatRelative(nextDecade, { base, locale: 'en-US', numeric: 'always', timeZone: 'UTC' })).toBe(
      'in 10 years',
    );
    expect(formatRelative(previousDecade, { base, locale: 'en-US', numeric: 'always', timeZone: 'UTC' })).toBe(
      '10 years ago',
    );
  });

  it('requires an explicit timezone for ZonedDateTime inputs in different zones', () => {
    const base = parse('2026-03-21T10:00:00[UTC]', { as: 'zonedDateTime' });
    const target = parse('2026-04-21T12:00:00[Europe/Berlin]', { as: 'zonedDateTime' });

    expect(() => formatRelative(target, { base })).toThrow(TempoInvalidInputError);
    expect(formatRelative(target, { base, locale: 'en-US', numeric: 'always', timeZone: 'UTC' })).toBe('in 1 month');
  });
});

describe('formatParts', () => {
  it('returns individual format parts', () => {
    const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });
    const parts = formatParts(instant, { locale: 'en-US', pattern: 'medium', timeZone: 'UTC' });

    expect(parts.some((p) => p.type === 'month' && p.value === 'Mar')).toBe(true);
    expect(parts.some((p) => p.type === 'day' && p.value === '21')).toBe(true);
  });
});

describe('parseDuration / formatDuration', () => {
  it('parses an ISO duration string', () => {
    expect(parseDuration('PT2H30M').toString()).toBe('PT2H30M');
  });

  it('parses a DurationLike object', () => {
    expect(parseDuration({ hours: 2, minutes: 30 }).toString()).toBe('PT2H30M');
  });

  it('rejects invalid duration input', () => {
    expect(() => parseDuration('invalid')).toThrow(TempoInvalidInputError);
  });

  it('preserves the original Temporal error as cause for parseDuration', () => {
    expect.assertions(2);

    try {
      parseDuration('invalid');
    } catch (err) {
      expect(err).toBeInstanceOf(TempoInvalidInputError);
      expect((err as Error).cause).toBeInstanceOf(Error);
    }
  });

  it('formats a duration with fallback when Intl.DurationFormat is unavailable', () => {
    // The fallback is English-only; verify it produces a human-readable string.
    const result = formatDuration('PT2H30M');

    expect(result).toMatch(/2.*hour.*30.*minute/i);
  });

  it('formats a zero duration', () => {
    expect(formatDuration('PT0S')).toMatch(/^0/);
  });
});

describe('formatTimer', () => {
  it('formats minutes and seconds under an hour', () => {
    expect(formatTimer('PT47M12S')).toBe('47:12');
    expect(formatTimer('PT5M')).toBe('5:00');
    expect(formatTimer('PT0S')).toBe('0:00');
  });

  it('formats hours once the duration reaches an hour', () => {
    expect(formatTimer('PT1H2M35S')).toBe('1:02:35');
    expect(formatTimer({ hours: 25, minutes: 1, seconds: 2 })).toBe('25:01:02');
  });

  it('formats milliseconds input by truncating sub-second parts', () => {
    expect(formatTimer({ milliseconds: 3_753_000 })).toBe('1:02:33');
    expect(formatTimer({ milliseconds: 5_999 })).toBe('0:05');
  });

  it('clamps negative durations to zero', () => {
    expect(formatTimer({ seconds: -90 })).toBe('0:00');
  });

  it('folds days into hours as 24-hour days', () => {
    expect(formatTimer({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe('26:03:04');
  });

  it('always renders the hours part when requested', () => {
    expect(formatTimer('PT5M', { hours: 'always' })).toBe('0:05:00');
    expect(formatTimer('PT47M12S', { hours: 'always' })).toBe('0:47:12');
  });

  it('rejects durations larger than days', () => {
    expect(() => formatTimer('P1W')).toThrow(TempoInvalidInputError);
    expect(() => formatTimer({ months: 1 })).toThrow(TempoInvalidInputError);
    expect(() => formatTimer({ years: 1 })).toThrow(TempoInvalidInputError);
  });
});
describe('formatRange order normalization', () => {
  const options = { locale: 'en-GB', pattern: 'short', timeZone: 'UTC' } as const;

  it('formats reversed instants like the sorted pair', () => {
    const morning = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const evening = parse('2026-03-21T12:00:00Z', { as: 'instant' });

    expect(formatRange(evening, morning, options)).toBe(formatRange(morning, evening, options));
  });

  it('formats reversed plain dates in a shared timezone', () => {
    const earlier = parse('2026-03-21', { as: 'plainDate' });
    const later = parse('2026-03-23', { as: 'plainDate' });

    expect(formatRange(later, earlier, options)).toContain('–');
    expect(formatRangeParts(later, earlier, options).some((p) => p.source === 'startRange')).toBe(true);
  });
});
