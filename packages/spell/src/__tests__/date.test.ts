import { ValidationError, s } from '../index';

describe('s.date()', () => {
  const d = new Date('2024-06-01');

  it('accepts a valid Date', () => {
    expect(s.date().parse(d)).toBe(d);
  });

  it('rejects an invalid Date, strings, and numbers', () => {
    expect(() => s.date().parse(new Date('invalid'))).toThrow('Expected valid date');
    expect(() => s.date().parse('2024-01-01')).toThrow(ValidationError);
    expect(() => s.date().parse(1700000000000)).toThrow(ValidationError);
  });

  it('min / max', () => {
    const min = new Date('2024-01-01');
    const max = new Date('2024-12-31');

    expect(s.date().min(min).parse(d)).toBe(d);
    expect(() => s.date().min(max).parse(d)).toThrow();
    expect(s.date().max(max).parse(d)).toBe(d);
    expect(() => s.date().max(min).parse(d)).toThrow();
  });
});

describe('coerce.date()', () => {
  it('coerces ISO strings and timestamps', () => {
    expect(s.coerce.date().min(new Date('2000-01-01')).parse('2024-01-01')).toBeInstanceOf(Date);
    expect(s.coerce.date().parse(1700000000000)).toBeInstanceOf(Date);
  });

  it('rejects unparseable strings', () => {
    expect(() => s.coerce.date().parse('not-a-date')).toThrow();
  });
});
