import { Temporal } from '@vielzeug/tempo';

import { between, birthday, future, month, past, recent, weekday } from '../date/date';
import { de } from '../locales/de';
import { en } from '../locales/en';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('date', () => {
  it('past returns a ZonedDateTime before now', () => {
    const now = Temporal.Now.zonedDateTimeISO('UTC');
    const value = past(ctx());

    expect(Temporal.ZonedDateTime.compare(value, now)).toBeLessThan(0);
  });

  it('future returns a ZonedDateTime after now', () => {
    const now = Temporal.Now.zonedDateTimeISO('UTC');
    const value = future(ctx());

    expect(Temporal.ZonedDateTime.compare(value, now)).toBeGreaterThan(0);
  });

  it('recent returns a ZonedDateTime before now but within 1 day', () => {
    const now = Temporal.Now.zonedDateTimeISO('UTC');
    const value = recent(ctx());
    const diffSeconds = Number(now.toInstant().epochNanoseconds - value.toInstant().epochNanoseconds) / 1e9;

    expect(Temporal.ZonedDateTime.compare(value, now)).toBeLessThan(0);
    expect(diffSeconds).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it('between returns a date between from and to', () => {
    const from = Temporal.ZonedDateTime.from('2020-01-01T00:00:00Z[UTC]');
    const to = Temporal.ZonedDateTime.from('2020-12-31T00:00:00Z[UTC]');
    const value = between(ctx(), from, to);

    expect(Temporal.ZonedDateTime.compare(value, from)).toBeGreaterThanOrEqual(0);
    expect(Temporal.ZonedDateTime.compare(value, to)).toBeLessThanOrEqual(0);
  });

  it('birthday returns a PlainDate', () => {
    const value = birthday(ctx());

    expect(value).toBeInstanceOf(Temporal.PlainDate);
  });

  it('weekday returns a known English day for "en" locale', () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const value = weekday(ctx(1, en));

    expect(days).toContain(value);
  });

  it('month returns a known English month for "en" locale', () => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const value = month(ctx(1, en));

    expect(months).toContain(value);
  });

  it('weekday returns a known German day for "de" locale', () => {
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const value = weekday(ctx(1, de));

    expect(days).toContain(value);
  });

  it('month returns a known German month for "de" locale', () => {
    const months = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
    const value = month(ctx(1, de));

    expect(months).toContain(value);
  });

  it('between returns "from" when from > to', () => {
    const from = Temporal.ZonedDateTime.from('2020-12-31T00:00:00Z[UTC]');
    const to = Temporal.ZonedDateTime.from('2020-01-01T00:00:00Z[UTC]');
    const value = between(ctx(), from, to);

    expect(Temporal.ZonedDateTime.compare(value, from)).toBe(0);
  });

  it('birthday with custom minAge: 25, maxAge: 35 produces a date within that age range', () => {
    const ref = Temporal.ZonedDateTime.from('2024-01-01T00:00:00Z[UTC]');
    const value = birthday(ctx(), { maxAge: 35, minAge: 25, ref });
    const ageYears = ref.year - value.year;

    expect(ageYears).toBeGreaterThanOrEqual(25);
    expect(ageYears).toBeLessThanOrEqual(35);
  });
});
