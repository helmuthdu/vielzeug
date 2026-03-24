import { ValidationError, v } from '../index';

describe('v.date()', () => {
  const d = new Date('2024-06-01');

  it('accepts a valid Date', () => {
    expect(v.date().parse(d)).toBe(d);
  });

  it('rejects an invalid Date, strings, and numbers', () => {
    expect(() => v.date().parse(new Date('invalid'))).toThrow('Expected valid date');
    expect(() => v.date().parse('2024-01-01')).toThrow(ValidationError);
    expect(() => v.date().parse(1700000000000)).toThrow(ValidationError);
  });

  it('min / max', () => {
    const min = new Date('2024-01-01');
    const max = new Date('2024-12-31');

    expect(v.date().min(min).parse(d)).toBe(d);
    expect(() => v.date().min(max).parse(d)).toThrow();
    expect(v.date().max(max).parse(d)).toBe(d);
    expect(() => v.date().max(min).parse(d)).toThrow();
  });
});

describe('coerce.date()', () => {
  it('coerces ISO strings and timestamps', () => {
    expect(v.coerce.date().min(new Date('2000-01-01')).parse('2024-01-01')).toBeInstanceOf(Date);
    expect(v.coerce.date().parse(1700000000000)).toBeInstanceOf(Date);
  });

  it('rejects unparseable strings', () => {
    expect(() => v.coerce.date().parse('not-a-date')).toThrow();
  });
});
