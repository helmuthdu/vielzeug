import { timeDiff } from '../timeDiff';

const DATE_NOW = Date.now();

describe('timeDiff', () => {
  it('returns YEAR for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 2 * 365 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'year', value: 2 });
  });

  it('returns MONTH for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 5 * 30 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'month', value: 5 });
  });

  it('returns WEEK for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 3 * 7 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'week', value: 3 });
  });

  it('returns DAY for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 3 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'day', value: 3 });
  });

  it('returns HOUR for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 7 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'hour', value: 7 });
  });

  it('returns MINUTE for future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 42 * 60 * 1000 + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'minute', value: 42 });
  });

  it('returns SECOND for less than 1 minute future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 10 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'second', value: 10 });
  });

  it('returns YEAR for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 3 * 366 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'year', value: 3 });
  });

  it('returns MONTH for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 8 * 31 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'month', value: 8 });
  });

  it('returns WEEK for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 2 * 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'week', value: 2 });
  });

  it('returns DAY for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 5 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'day', value: 5 });
  });

  it('returns HOUR for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 12 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'hour', value: 12 });
  });

  it('returns MINUTE for past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 25 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'minute', value: 25 });
  });

  it('returns SECOND for less than 1 minute past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 10 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'second', value: 10 });
  });

  it('returns undefined for invalid date', () => {
    const now = new Date(DATE_NOW);
    expect(timeDiff('invalid-date', now)).toBeUndefined();
    expect(timeDiff('invalid-date', now)).toBeUndefined();
  });

  it('returns 1 YEAR for exactly 1 year', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 366 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'year', value: 1 });
  });

  it('returns 1 MONTH for exactly 1 month', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 31 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'month', value: 1 });
  });

  it('returns 1 WEEK for exactly 1 week', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 7 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'week', value: 1 });
  });

  it('returns 1 DAY for exactly 1 day', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 24 * 60 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'day', value: 1 });
  });

  it('returns 1 HOUR for exactly 1 hour', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 60 * 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'hour', value: 1 });
  });

  it('returns 1 MINUTE for exactly 1 minute', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 60 * 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'minute', value: 1 });
  });

  it('returns 1 SECOND for exactly 1 second future', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'second', value: 1 });
  });

  it('returns 1 SECOND for exactly 1 second past', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW - 1000);
    expect(timeDiff(target, now)).toEqual({ unit: 'second', value: 1 });
  });

  it('respects allowedUnits filter', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 10 * 24 * 60 * 60 * 1000); // 10 days
    expect(timeDiff(target, now, ['day', 'hour'])).toEqual({ unit: 'day', value: 10 });
    expect(timeDiff(target, now, ['hour'])).toEqual({ unit: 'hour', value: 240 });
  });

  it('returns smallest allowed unit with value 0 if SECOND not allowed', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 100);
    expect(timeDiff(target, now, ['minute'])).toEqual({ unit: 'minute', value: 0 });
  });

  it('works with ISO string input', () => {
    const now = new Date(DATE_NOW);
    const target = new Date(DATE_NOW + 2 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target.toISOString(), now.toISOString())).toEqual({ unit: 'day', value: 2 });
  });
});
