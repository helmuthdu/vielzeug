import { timeDiff } from '../timeDiff';

describe('timeDiff', () => {
  it('returns YEAR for future', () => {
    const target = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'YEAR', value: 2 });
  });

  it('returns MONTH for future', () => {
    const target = new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'MONTH', value: 5 });
  });

  it('returns WEEK for future', () => {
    const target = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'WEEK', value: 3 });
  });

  it('returns DAY for future', () => {
    const target = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'DAY', value: 3 });
  });

  it('returns HOUR for future', () => {
    const target = new Date(Date.now() + 7 * 60 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'HOUR', value: 7 });
  });

  it('returns MINUTE for future', () => {
    const target = new Date(Date.now() + 42 * 60 * 1000 + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'MINUTE', value: 42 });
  });

  it('returns SECOND for less than 1 minute future', () => {
    const target = new Date(Date.now() + 10 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'SECOND', value: 10 });
  });

  it('returns SECOND with value 0 for past date in future mode', () => {
    const target = new Date(Date.now() - 1000 * 60 * 60);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'SECOND', value: 0 });
  });

  it('returns YEAR for past', () => {
    const target = new Date(Date.now() - 3 * 366 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'YEAR', value: 3 });
  });

  it('returns MONTH for past', () => {
    const target = new Date(Date.now() - 8 * 31 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'MONTH', value: 8 });
  });

  it('returns WEEK for past', () => {
    const target = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'WEEK', value: 2 });
  });

  it('returns DAY for past', () => {
    const target = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'DAY', value: 5 });
  });

  it('returns HOUR for past', () => {
    const target = new Date(Date.now() - 12 * 60 * 60 * 1000 - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'HOUR', value: 12 });
  });

  it('returns MINUTE for past', () => {
    const target = new Date(Date.now() - 25 * 60 * 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'MINUTE', value: 25 });
  });

  it('returns SECOND for less than 1 minute past', () => {
    const target = new Date(Date.now() - 10 * 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'SECOND', value: 10 });
  });

  it('returns SECOND with value 0 for future date in past mode', () => {
    const target = new Date(Date.now() + 1000 * 60 * 60);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'SECOND', value: 0 });
  });

  it('returns INVALID_DATE for invalid date', () => {
    expect(timeDiff('invalid-date', 'FUTURE')).toEqual({ unit: 'INVALID_DATE', value: 0 });
    expect(timeDiff('invalid-date', 'PAST')).toEqual({ unit: 'INVALID_DATE', value: 0 });
  });

  it('returns 1 YEAR for exactly 1 year', () => {
    const target = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'YEAR', value: 1 });
  });

  it('returns 1 MONTH for exactly 1 month', () => {
    const target = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'MONTH', value: 1 });
  });

  it('returns 1 WEEK for exactly 1 week', () => {
    const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'WEEK', value: 1 });
  });

  it('returns 1 DAY for exactly 1 day', () => {
    const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'DAY', value: 1 });
  });

  it('returns 1 HOUR for exactly 1 hour', () => {
    const target = new Date(Date.now() + 60 * 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'HOUR', value: 1 });
  });

  it('returns 1 MINUTE for exactly 1 minute', () => {
    const target = new Date(Date.now() + 60 * 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'MINUTE', value: 1 });
  });

  it('returns 1 SECOND for exactly 1 second future', () => {
    const target = new Date(Date.now() + 1000);
    expect(timeDiff(target, 'FUTURE')).toEqual({ unit: 'SECOND', value: 1 });
  });

  it('returns 1 SECOND for exactly 1 second past', () => {
    const target = new Date(Date.now() - 1000);
    expect(timeDiff(target, 'PAST')).toEqual({ unit: 'SECOND', value: 1 });
  });

  it('respects allowedUnits filter', () => {
    const target = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
    expect(timeDiff(target, 'FUTURE', ['DAY', 'HOUR'])).toEqual({ unit: 'DAY', value: 10 });
    expect(timeDiff(target, 'FUTURE', ['HOUR'])).toEqual({ unit: 'HOUR', value: 240 });
  });

  it('returns smallest allowed unit with value 0 if SECOND not allowed', () => {
    const target = new Date(Date.now() + 100);
    expect(timeDiff(target, 'FUTURE', ['MINUTE'])).toEqual({ unit: 'MINUTE', value: 0 });
  });

  it('works with ISO string input', () => {
    const target = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(timeDiff(target.toISOString(), 'FUTURE')).toEqual({ unit: 'DAY', value: 2 });
  });
});
