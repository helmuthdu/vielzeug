import { describe, expect, it } from 'vitest';

import {
  clamp,
  classifyExpiry,
  contains,
  dateRange,
  difference,
  endOf,
  format,
  formatDuration,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatZoned,
  humanize,
  inTimeZone,
  isAfter,
  isBefore,
  isSame,
  isValid,
  now,
  type ParseAs,
  parse,
  parseDuration,
  recurrence,
  shift,
  startOf,
  TempoInvalidInputError,
  TempoMissingTzError,
  Temporal,
  timeDiff,
  toInstant,
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
        thresholds: { invalid: { months: 1 } as never },
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

  it('floors to the start of a day', () => {
    expect(startOf(zoned, 'day').toString()).toBe('2026-03-21T00:00:00+00:00[UTC]');
  });

  it('floors to the start of an hour', () => {
    expect(startOf(zoned, 'hour').toString()).toBe('2026-03-21T10:00:00+00:00[UTC]');
  });

  it('floors to the start of a month', () => {
    expect(startOf(zoned, 'month').toString()).toBe('2026-03-01T00:00:00+00:00[UTC]');
  });

  it('floors to the start of a year', () => {
    expect(startOf(zoned, 'year').toString()).toBe('2026-01-01T00:00:00+00:00[UTC]');
  });

  it('returns the last nanosecond of the unit for endOf', () => {
    expect(endOf(zoned, 'day').toString()).toBe('2026-03-21T23:59:59.999999999+00:00[UTC]');
  });

  it('respects weekStartsOn for week boundary', () => {
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

  it('formats a duration with fallback when Intl.DurationFormat is unavailable', () => {
    // The fallback is English-only; verify it produces a human-readable string.
    const result = formatDuration('PT2H30M');

    expect(result).toMatch(/2.*hour.*30.*minute/i);
  });

  it('formats a zero duration', () => {
    expect(formatDuration('PT0S')).toMatch(/^0/);
  });
});

describe('humanize', () => {
  it('humanizes a single unit', () => {
    expect(humanize({ unit: 'day', value: 1 })).toBe('1 day');
    expect(humanize({ unit: 'day', value: 3 })).toBe('3 days');
  });

  it('humanizes zero', () => {
    expect(humanize({ unit: 'millisecond', value: 0 })).toBe('0 milliseconds');
  });

  it('passes locale to Intl.NumberFormat when available', () => {
    // Locale-dependent digit rendering varies by ICU build; verify the unit suffix is correct.
    const result = humanize({ unit: 'day', value: 3 }, { locale: 'de' });

    expect(result).toMatch(/days$/);
  });
});

describe('timeDiff', () => {
  it('returns the largest non-zero unit', () => {
    const a = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const b = parse('2026-03-21T12:00:00Z', { as: 'instant' });

    expect(timeDiff(a, b)).toEqual({ unit: 'hour', value: 2 });
  });

  it('returns days for multi-day differences', () => {
    const a = parse('2026-03-21T10:00:00Z', { as: 'instant' });
    const b = parse('2026-03-24T10:00:00Z', { as: 'instant' });

    expect(timeDiff(a, b)).toEqual({ unit: 'day', value: 3 });
  });

  it('returns zero for identical instants', () => {
    const a = parse('2026-03-21T10:00:00Z', { as: 'instant' });

    expect(timeDiff(a, a)).toEqual({ unit: 'millisecond', value: 0 });
  });

  it('works with ZonedDateTime inputs', () => {
    const a = parse('2026-03-21T10:00:00[UTC]', { as: 'zonedDateTime' });
    const b = parse('2026-03-21T10:30:00[UTC]', { as: 'zonedDateTime' });

    expect(timeDiff(a, b)).toEqual({ unit: 'minute', value: 30 });
  });
});
