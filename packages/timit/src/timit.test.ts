import { describe, expect, it } from 'vitest';

import { Temporal } from '@js-temporal/polyfill';

import {
  add,
  asInstant,
  asZoned,
  diff,
  format,
  formatRange,
  now,
  subtract,
  within,
} from './timit';

describe('now', () => {
  it('creates a zoned date-time using the selected time zone', () => {
    const value = now('UTC');

    expect(value.timeZoneId).toBe('UTC');
  });
});

describe('asInstant', () => {
  it('parses ISO instant strings', () => {
    expect(asInstant('2026-03-21T10:15:30Z').toString()).toBe('2026-03-21T10:15:30Z');
  });

  it('parses plain date-time strings with an explicit time zone', () => {
    const instant = asInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });

    expect(instant.toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('throws when plain strings are used without a time zone', () => {
    expect(() => asInstant('2026-03-21T10:15:30')).toThrow('require a tz option');
  });
});

describe('asZoned', () => {
  it('converts instants to the target time zone', () => {
    const zoned = asZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });

  it('can switch a zoned date-time to another zone while preserving the instant', () => {
    const source = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');
    const shifted = asZoned(source, { tz: 'UTC' });

    expect(shifted.timeZoneId).toBe('UTC');
    expect(shifted.epochNanoseconds).toBe(source.epochNanoseconds);
  });
});

describe('date arithmetic', () => {
  it('adds and subtracts duration in zoned mode', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
    const plusHour = add(start, { hours: 1 });
    const minusHour = subtract(plusHour, { hours: 1 });

    expect(plusHour.toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
    expect(minusHour.toString()).toBe(start.toString());
  });

  it('computes duration between two values', () => {
    const duration = diff('2026-03-21T10:00:00Z', '2026-03-21T12:30:00Z', {
      largestUnit: 'hours',
      smallestUnit: 'minutes',
    });

    expect(duration.toString()).toBe('PT2H30M');
  });
});

describe('range and formatting', () => {
  it('checks if an instant is in an inclusive range', () => {
    const isInside = within('2026-03-21T11:00:00Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');
    const isOutside = within('2026-03-21T09:59:59Z', '2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z');

    expect(isInside).toBe(true);
    expect(isOutside).toBe(false);
  });

  it('formats a single instant with pattern presets', () => {
    const result = format('2026-03-21T10:15:30Z', {
      pattern: 'short',
      locale: 'en-GB',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });

  it('formats a range of instants', () => {
    const result = formatRange('2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z', {
      pattern: 'short',
      locale: 'en-GB',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:00');
    expect(result).toContain('12:00');
  });
});

