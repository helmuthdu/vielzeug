import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';
import { expandCadence, parseCadence, resolveCadenceDates, toCadence } from '../cadence';
import { CadenceError } from '../errors';

function zoned(iso: string): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.from(iso);
}

function collect(start: Temporal.ZonedDateTime, rule: string, options?: Parameters<typeof expandCadence>[2]): string[] {
  return [...expandCadence(start, parseCadence(rule), options)].map((zdt) => {
    const pdt = zdt.toPlainDateTime();
    const base = `${pdt.year.toString().padStart(4, '0')}-${pdt.month.toString().padStart(2, '0')}-${pdt.day
      .toString()
      .padStart(2, '0')}T${pdt.hour.toString().padStart(2, '0')}:${pdt.minute.toString().padStart(2, '0')}`;
    return pdt.second === 0 ? base : `${base}:${pdt.second.toString().padStart(2, '0')}`;
  });
}

describe('parseCadence', () => {
  it('parses the common parts into a validated spec', () => {
    const spec = parseCadence('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=4');
    expect(spec.freq).toBe('weekly');
    expect(spec.interval).toBe(2);
    expect(spec.count).toBe(4);
    expect(spec.byday).toEqual([{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }]);
  });

  it('sorts and dedupes number lists and accepts UNTIL instants', () => {
    const spec = parseCadence('FREQ=MONTHLY;BYMONTHDAY=15,-1,1;UNTIL=20270101T000000Z');
    expect(spec.bymonthday).toEqual([-1, 1, 15]);
    expect(spec.until?.equals(Temporal.Instant.from('2027-01-01T00:00:00Z'))).toBe(true);
  });

  it('rejects malformed and unsupported rules with CadenceError', () => {
    expect(() => parseCadence('FREQ=nope')).toThrow(CadenceError);
    expect(() => parseCadence('INTERVAL=2')).toThrow(CadenceError); // missing FREQ
    expect(() => parseCadence('FREQ=DAILY;INTERVAL=0')).toThrow(CadenceError);
    expect(() => parseCadence('FREQ=DAILY;COUNT=2;UNTIL=20270101T000000Z')).toThrow(CadenceError);
    expect(() => parseCadence('FREQ=YEARLY;BYWEEKNO=3')).toThrow(CadenceError);
    expect(() => parseCadence('FREQ=DAILY;BYYEARDAY=100')).toThrow(CadenceError);
    expect(() => parseCadence('FREQ=MONTHLY;BYYEARDAY=100')).toThrow(CadenceError);
    expect(() => parseCadence('FREQ=YEARLY;BYSETPOS=1;BYMONTH=2')).not.toThrow();
  });
});

describe('toCadence', () => {
  it('round-trips canonical rules', () => {
    const rules = [
      'FREQ=DAILY;INTERVAL=2;BYHOUR=9,17',
      'FREQ=WEEKLY;BYDAY=MO,WE;WKST=SU',
      'FREQ=MONTHLY;BYMONTHDAY=-1',
      'FREQ=YEARLY;BYSETPOS=4;BYMONTH=11;BYMONTHDAY=-1;BYDAY=SU',
      'FREQ=WEEKLY;UNTIL=20270101T000000Z',
    ];
    for (const rule of rules) expect(toCadence(parseCadence(rule))).toBe(rule);
  });
});

describe('expandCadence', () => {
  it('always yields the start first, even when it does not match the pattern', () => {
    const start = zoned('2026-06-03T10:00:00+02:00[Europe/Vienna]'); // Wednesday
    expect(collect(start, 'FREQ=WEEKLY;BYDAY=MO;COUNT=3')).toEqual([
      '2026-06-03T10:00',
      '2026-06-08T10:00',
      '2026-06-15T10:00',
    ]);
  });

  it('expands sub-daily rules monotonically', () => {
    const start = zoned('2026-01-31T23:59:50+01:00[Europe/Vienna]');
    expect(collect(start, 'FREQ=SECONDLY;INTERVAL=5;COUNT=3')).toEqual([
      '2026-01-31T23:59:50',
      '2026-01-31T23:59:55',
      '2026-02-01T00:00',
    ]);
  });

  it('expands daily rules and multiplies BYHOUR entries', () => {
    const start = zoned('2026-03-01T08:00:00+01:00[Europe/Vienna]');
    expect(collect(start, 'FREQ=DAILY;INTERVAL=3;BYHOUR=8,20;COUNT=5')).toEqual([
      '2026-03-01T08:00',
      '2026-03-01T20:00',
      '2026-03-04T08:00',
      '2026-03-04T20:00',
      '2026-03-07T08:00',
    ]);
  });

  it('honours UNTIL inclusively across a month boundary', () => {
    const start = zoned('2026-01-30T09:00:00+01:00[Europe/Vienna]');
    expect(collect(start, 'FREQ=DAILY;BYMONTHDAY=30,31;UNTIL=20260301T000000Z').slice(1)).toEqual(['2026-01-31T09:00']);
  });

  it('expands weekly rules with intervals and a custom week start', () => {
    const start = zoned('2026-01-05T07:30:00+01:00[Europe/Vienna]'); // Monday
    expect(collect(start, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;WKST=MO;COUNT=5').slice(1)).toEqual([
      '2026-01-06T07:30',
      '2026-01-08T07:30',
      '2026-01-20T07:30',
      '2026-01-22T07:30',
    ]);
  });

  it('expands monthly rules: BYMONTHDAY with negative days and clamping', () => {
    const start = zoned('2026-01-31T12:00:00+01:00[Europe/Vienna]');
    // Unlisted BYMONTHDAY clamps (Jan 31 start → Feb 28, Mar 31, …).
    expect(collect(start, 'FREQ=MONTHLY;COUNT=4')).toEqual([
      '2026-01-31T12:00',
      '2026-02-28T12:00',
      '2026-03-31T12:00',
      '2026-04-30T12:00',
    ]);
    // Explicit out-of-range days skip; -1 is the last day.
    expect(collect(start, 'FREQ=MONTHLY;BYMONTHDAY=31,-1;UNTIL=20260430T235959Z').slice(1)).toEqual([
      '2026-02-28T12:00',
      '2026-03-31T12:00',
      '2026-04-30T12:00',
    ]);
  });

  it('expands monthly weekday rules with and without ordinals', () => {
    const start = zoned('2026-01-01T09:00:00+01:00[Europe/Vienna]');
    // First Monday of every second month.
    expect(collect(start, 'FREQ=MONTHLY;INTERVAL=2;BYDAY=1MO;COUNT=3')).toEqual([
      '2026-01-01T09:00', // DTSTART yields first even though it is a Thursday
      '2026-01-05T09:00',
      '2026-03-02T09:00',
    ]);
    // All Fridays in a month.
    expect(collect(start, 'FREQ=MONTHLY;BYDAY=FR;BYMONTH=1;COUNT=6').slice(1)).toEqual([
      '2026-01-02T09:00',
      '2026-01-09T09:00',
      '2026-01-16T09:00',
      '2026-01-23T09:00',
      '2026-01-30T09:00',
    ]);
  });

  it('expands yearly rules including day-of-year and BYSETPOS', () => {
    const start = zoned('2026-06-01T00:00:00+02:00[Europe/Vienna]');
    // Day 100 and the last day of each year; 2026-04-10 is before the start.
    expect(collect(start, 'FREQ=YEARLY;BYYEARDAY=100,-1;COUNT=5').slice(1)).toEqual([
      '2026-12-31T00:00',
      '2027-04-10T00:00',
      '2027-12-31T00:00',
      '2028-04-09T00:00', // 2028 is a leap year: day 100 is April 9
    ]);
    // Last Sunday in November each year (BYSETPOS picks within the year's day set).
    const thanksgiving = collect(
      zoned('2026-01-01T12:00:00+01:00[Europe/Vienna]'),
      'FREQ=YEARLY;BYMONTH=11;BYDAY=SU;BYSETPOS=-1;COUNT=3',
    );
    expect(thanksgiving.slice(1)).toEqual(['2026-11-29T12:00', '2027-11-28T12:00']);
  });

  it('keeps wall-clock times across DST and skips nonexistent times', () => {
    const daily9 = zoned('2026-03-26T09:30:00+01:00[Europe/Vienna]');
    // Vienna springs forward 2026-03-29 02:00 → 03:00; 09:30 stays 09:30 local.
    expect(collect(daily9, 'FREQ=DAILY;COUNT=5')).toEqual([
      '2026-03-26T09:30',
      '2026-03-27T09:30',
      '2026-03-28T09:30',
      '2026-03-29T09:30',
      '2026-03-30T09:30',
    ]);
    // 02:30 does not exist on the shift day: the occurrence is skipped.
    const daily230 = zoned('2026-03-27T02:30:00+01:00[Europe/Vienna]');
    expect(collect(daily230, 'FREQ=DAILY;COUNT=4')).toEqual([
      '2026-03-27T02:30',
      '2026-03-28T02:30',
      '2026-03-30T02:30',
      '2026-03-31T02:30',
    ]);
  });

  it('respects the limit guard and never hangs on never-matching rules', () => {
    const start = zoned('2026-01-01T00:00:00+01:00[Europe/Vienna]');
    expect(collect(start, 'FREQ=MONTHLY;BYMONTHDAY=31;BYMONTH=2', { limit: 50 })).toEqual(['2026-01-01T00:00']);
  });

  it('applies monthly BYSETPOS against the month day set', () => {
    const start = zoned('2026-01-05T09:00:00+01:00[Europe/Vienna]');
    const firstMondays = collect(start, 'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1', { count: 3 });
    expect(firstMondays).toEqual(['2026-01-05T09:00', '2026-02-02T09:00', '2026-03-02T09:00']);
  });

  it('expands finer BY* sets inside sub-daily periods', () => {
    const start = zoned('2026-01-05T09:00:00+01:00[Europe/Vienna]');
    const hourly = collect(start, 'FREQ=HOURLY;INTERVAL=3;BYMINUTE=15', { count: 4 });
    expect(hourly).toEqual(['2026-01-05T09:00', '2026-01-05T09:15', '2026-01-05T12:15', '2026-01-05T15:15']);
  });

  it('expands minutely rules through finer BYSECOND values', () => {
    const start = zoned('2026-01-05T09:00:00+01:00[Europe/Vienna]');
    const minutely = collect(start, 'FREQ=MINUTELY;BYSECOND=0,30;BYHOUR=9', { count: 5 });
    expect(minutely.map((v) => v.slice(11))).toEqual(['09:00', '09:00:30', '09:01', '09:01:30', '09:02']);
  });

  it('treats never-matching rules as exhausted instead of hanging', () => {
    const start = zoned('2026-01-05T09:00:00+01:00[Europe/Vienna]');
    const only = collect(start, 'FREQ=MONTHLY;BYMONTHDAY=30;BYMONTH=2', { limit: 100 });
    expect(only).toEqual(['2026-01-05T09:00']);
  });
});

describe('resolveCadenceDates', () => {
  it('merges extra dates and removes exception dates in ascending order', () => {
    const start = zoned('2026-05-01T08:00:00+02:00[Europe/Vienna]');
    const spec = parseCadence('FREQ=DAILY;COUNT=3');
    const merged = [
      ...resolveCadenceDates(start, spec, {
        exdate: [zoned('2026-05-02T08:00:00+02:00[Europe/Vienna]')],
        rdate: [zoned('2026-05-01T18:00:00+02:00[Europe/Vienna]')],
      }),
    ].map((zdt) => zdt.toPlainDateTime().toString());
    expect(merged).toEqual(['2026-05-01T08:00:00', '2026-05-01T18:00:00', '2026-05-03T08:00:00']);
  });
});
