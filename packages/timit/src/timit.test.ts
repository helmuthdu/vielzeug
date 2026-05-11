import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';

import {
  clamp,
  difference,
  endOf,
  formatHuman,
  formatISO,
  formatDuration,
  formatRange,
  formatRelative,
  isAfter,
  isBefore,
  isSameDay,
  now,
  parseLocal,
  parseDuration,
  shift,
  startOf,
  toInstant,
  toZoned,
  within,
} from './timit';

describe('now', () => {
  it('creates a zoned date-time using the selected time zone', () => {
    const value = now('UTC');

    expect(value.timeZoneId).toBe('UTC');
  });
});

describe('toInstant', () => {
  it('parses plain local values with parseLocal helper', () => {
    expect(parseLocal('2026-03-21').toString()).toBe('2026-03-21T00:00:00');
    expect(parseLocal('2026-03-21T10:15:30').toString()).toBe('2026-03-21T10:15:30');
  });

  it('throws for invalid parseLocal values', () => {
    expect(() => parseLocal('not-a-date')).toThrow(
      '[timit] Invalid local date/time string. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.',
    );
  });

  it('parses ISO instant strings', () => {
    expect(toInstant('2026-03-21T10:15:30Z').toString()).toBe('2026-03-21T10:15:30Z');
  });

  it('parses zone-annotated local strings as zoned values', () => {
    const instant = toInstant('2026-03-21T10:15:30[America/New_York]');

    expect(instant.toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('treats offset strings as absolute instants and ignores tz for parsing', () => {
    const withoutTz = toInstant('2026-03-21T10:15:30+02:00');
    const withTz = toInstant('2026-03-21T10:15:30+02:00', { tz: 'UTC' });

    expect(withTz.epochNanoseconds).toBe(withoutTz.epochNanoseconds);
    expect(withTz.toString()).toBe('2026-03-21T08:15:30Z');
  });

  it('throws a clear error when plain strings are used without a time zone', () => {
    expect(() => toInstant('2026-03-21T10:15:30')).toThrow('[timit] Local date/time input requires options.tz.');
  });
});

describe('toZoned and shift', () => {
  it('converts instants to the target time zone', () => {
    const zoned = toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });

  it('shifts duration in zoned mode and infers timezone from input', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
    const plusHour = shift(start, { hours: 1 });
    const minusHour = shift(plusHour, { hours: -1 });

    expect(plusHour.toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
    expect(minusHour.toString()).toBe(start.toString());
  });

  it('shifts with explicit tz override for string inputs', () => {
    const plusHour = shift('2026-03-08T01:30:00Z', { hours: 1 }, { tz: 'America/New_York' });

    expect(plusHour.timeZoneId).toBe('America/New_York');
  });
});

describe('difference and range helpers', () => {
  it('computes duration between two values with explicit timezone', () => {
    const duration = difference('2026-03-21T10:00:00Z', '2026-03-21T12:30:00Z', {
      largestUnit: 'hour',
      smallestUnit: 'minute',
      tz: 'UTC',
    });

    expect(duration.toString()).toBe('PT2H30M');
  });

  it('checks inclusive range and normalizes reversed bounds', () => {
    expect(within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z')).toBe(true);
    expect(within('2026-03-21T11:00:00Z', '2026-03-21T12:00:00Z', '2026-03-21T10:00:00Z')).toBe(true);
  });

  it('clamps a value to bounds', () => {
    const result = clamp('2026-03-21T13:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');

    expect(result.toString()).toBe('2026-03-21T12:00:00Z');
  });
});

describe('comparison helpers', () => {
  it('compares instants', () => {
    expect(isBefore('2026-03-21T10:00:00Z', '2026-03-21T11:00:00Z')).toBe(true);
    expect(isAfter('2026-03-21T12:00:00Z', '2026-03-21T11:00:00Z')).toBe(true);
  });

  it('checks same day in a target timezone with explicit tz', () => {
    const lateUtc = '2026-03-21T23:30:00Z';
    const earlyUtc = '2026-03-22T00:15:00Z';

    expect(isSameDay(lateUtc, earlyUtc, { tz: 'America/New_York' })).toBe(true);
    expect(isSameDay(lateUtc, earlyUtc, { tz: 'UTC' })).toBe(false);
  });
});

describe('boundary helpers', () => {
  it('calculates startOf and endOf day with explicit timezone', () => {
    const input = '2026-03-21T10:15:30Z';

    const dayStart = startOf(input, 'day', { tz: 'UTC' });
    const dayEnd = endOf(input, 'day', { tz: 'UTC' });

    expect(dayStart.toString()).toBe('2026-03-21T00:00:00+00:00[UTC]');
    expect(dayEnd.toString()).toBe('2026-03-21T23:59:59.999999999+00:00[UTC]');
  });

  it('infers timezone from zoned inputs in startOf and endOf', () => {
    const input = Temporal.ZonedDateTime.from('2026-03-21T10:15:30-04:00[America/New_York]');

    const dayStart = startOf(input, 'day');
    const dayEnd = endOf(input, 'day');

    expect(dayStart.timeZoneId).toBe('America/New_York');
    expect(dayEnd.timeZoneId).toBe('America/New_York');
  });
});

describe('formatting', () => {
  it('formats a single instant with pattern presets', () => {
    const result = formatHuman('2026-03-21T10:15:30Z', {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });

  it('inherits timezone from zoned input in formatHuman', () => {
    const zoned = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');
    const result = formatHuman(zoned, {
      locale: 'en-GB',
      pattern: 'short',
    });

    expect(result).toContain('21/03/2026');
  });

  it('formats canonical ISO instant and zoned output', () => {
    expect(formatISO('2026-03-21T10:15:30Z')).toBe('2026-03-21T10:15:30Z');
    expect(formatISO('2026-03-21T10:15:30Z', { style: 'zoned', tz: 'Europe/Berlin' })).toBe(
      '2026-03-21T11:15:30+01:00[Europe/Berlin]',
    );
  });

  it('formats range and relative text', () => {
    const range = formatRange('2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z', {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    const relative = formatRelative('2026-03-21T12:00:00Z', {
      base: '2026-03-21T10:00:00Z',
      locale: 'en-US',
      numeric: 'always',
    });

    expect(range).toContain('21/03/2026');
    expect(range).toContain('10:00');
    expect(range).toContain('12:00');
    expect(relative).toBe('in 2 hours');
  });
});

describe('duration helpers', () => {
  it('parses duration input', () => {
    expect(parseDuration('PT2H30M').toString()).toBe('PT2H30M');
  });

  it('formats duration as ISO by default', () => {
    expect(formatDuration('PT2H30M')).toBe('PT2H30M');
  });

  it('accepts locale/style options in formatDuration', () => {
    const result = formatDuration('PT2H30M', { locale: 'en-US', style: 'short' });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
