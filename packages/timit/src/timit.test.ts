import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';

import { d, diff, formatHuman, formatISO, formatRange, now, shift, toInstant, toZoned, within } from './timit';

describe('now', () => {
  it('creates a zoned date-time using the selected time zone', () => {
    const value = now('UTC');

    expect(value.timeZoneId).toBe('UTC');
  });
});

describe('d namespace', () => {
  it('exposes Temporal and helper methods under a single namespace', () => {
    const value = d.now('UTC');

    expect(value.timeZoneId).toBe('UTC');
    expect(d.formatISO(value)).toBe(formatISO(value));
    expect(d.Temporal).toBe(Temporal);
  });
});

describe('toInstant', () => {
  it('parses ISO instant strings', () => {
    expect(toInstant('2026-03-21T10:15:30Z').toString()).toBe('2026-03-21T10:15:30Z');
  });

  it('parses zone-annotated local strings as zoned values', () => {
    const instant = toInstant('2026-03-21T10:15:30[America/New_York]');

    expect(instant.toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('does not reinterpret zone-annotated local strings when tz is provided', () => {
    const withoutTz = toInstant('2026-03-21T10:15:30[America/New_York]');
    const withTz = toInstant('2026-03-21T10:15:30[America/New_York]', { tz: 'UTC' });

    expect(withTz.epochNanoseconds).toBe(withoutTz.epochNanoseconds);
  });

  it('treats offset strings as absolute instants and ignores tz for parsing', () => {
    const withoutTz = toInstant('2026-03-21T10:15:30+02:00');
    const withTz = toInstant('2026-03-21T10:15:30+02:00', { tz: 'UTC' });

    expect(withTz.epochNanoseconds).toBe(withoutTz.epochNanoseconds);
    expect(withTz.toString()).toBe('2026-03-21T08:15:30Z');
  });

  it('parses plain date-time strings with an explicit time zone', () => {
    const instant = toInstant('2026-03-21T10:15:30', { tz: 'America/New_York' });

    expect(instant.toString()).toBe('2026-03-21T14:15:30Z');
  });

  it('throws a clear error when plain strings are used without a time zone', () => {
    expect(() => toInstant('2026-03-21T10:15:30')).toThrow('[timit] Local date/time input requires options.tz.');
  });

  it('throws a clear error for invalid strings', () => {
    expect(() => toInstant('this-is-not-a-time')).toThrow(
      '[timit] Invalid time string. Expected ISO instant, zoned date/time, or plain local date/time.',
    );
  });
});

describe('toZoned', () => {
  it('converts instants to the target time zone', () => {
    const zoned = toZoned('2026-03-21T10:15:30Z', { tz: 'Europe/Berlin' });

    expect(zoned.timeZoneId).toBe('Europe/Berlin');
    expect(zoned.hour).toBe(11);
  });

  it('can switch a zoned date-time to another zone while preserving the instant', () => {
    const source = Temporal.ZonedDateTime.from('2026-03-21T10:15:30+01:00[Europe/Berlin]');
    const shifted = toZoned(source, { tz: 'UTC' });

    expect(shifted.timeZoneId).toBe('UTC');
    expect(shifted.epochNanoseconds).toBe(source.epochNanoseconds);
  });

  it('parses plain local strings directly in the target zone', () => {
    const zoned = toZoned('2026-03-21T10:15:30', { tz: 'America/New_York' });

    expect(zoned.toString()).toBe('2026-03-21T10:15:30-04:00[America/New_York]');
  });

  it('parses date-only local strings in the target zone', () => {
    const zoned = toZoned('2026-03-21', { tz: 'America/New_York' });

    expect(zoned.toString()).toBe('2026-03-21T00:00:00-04:00[America/New_York]');
  });

  it('converts zone-annotated local strings to the requested display zone', () => {
    const zoned = toZoned('2026-03-21T10:15:30[America/New_York]', { tz: 'UTC' });

    expect(zoned.toString()).toBe('2026-03-21T14:15:30+00:00[UTC]');
  });

  it('throws a prefixed error for plain local strings without tz', () => {
    expect(() => toZoned('2026-03-21T10:15:30')).toThrow('[timit] Local date/time input requires options.tz.');
  });

  it('throws a parse error for malformed zone-annotated strings', () => {
    expect(() => toZoned('2026-03-21T10:15:30[America/New_York')).toThrow(
      '[timit] Invalid time string. Expected ISO instant, zoned date/time, or plain local date/time.',
    );
  });
});

describe('error consistency', () => {
  it('uses the same missing-tz message for local instant and zoned conversion', () => {
    const localInput = '2026-03-21T10:15:30';

    expect(() => toInstant(localInput)).toThrow('[timit] Local date/time input requires options.tz.');
    expect(() => toZoned(localInput)).toThrow('[timit] Local date/time input requires options.tz.');
  });
});

describe('date arithmetic', () => {
  it('shifts duration in zoned mode', () => {
    const start = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
    const plusHour = shift(start, { hours: 1 });
    const minusHour = shift(plusHour, { hours: -1 });

    expect(plusHour.toString()).toBe('2026-03-08T03:30:00-04:00[America/New_York]');
    expect(minusHour.toString()).toBe(start.toString());
  });

  it('computes duration between two values', () => {
    const duration = diff('2026-03-21T10:00:00Z', '2026-03-21T12:30:00Z', {
      largestUnit: 'hour',
      smallestUnit: 'minute',
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

  it('normalizes reversed bounds for range checks', () => {
    const isInside = within('2026-03-21T11:00:00Z', '2026-03-21T12:00:00Z', '2026-03-21T10:00:00Z');

    expect(isInside).toBe(true);
  });

  it('formats a single instant with pattern presets', () => {
    const result = formatHuman('2026-03-21T10:15:30Z', {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:15');
  });

  it('formats a single instant as canonical ISO', () => {
    expect(formatISO('2026-03-21T10:15:30Z')).toBe('2026-03-21T10:15:30Z');
  });

  it('formats a range of instants', () => {
    const result = formatRange('2026-03-21T10:00:00Z', '2026-03-21T12:00:00Z', {
      locale: 'en-GB',
      pattern: 'short',
      tz: 'UTC',
    });

    expect(result).toContain('21/03/2026');
    expect(result).toContain('10:00');
    expect(result).toContain('12:00');
  });
});
