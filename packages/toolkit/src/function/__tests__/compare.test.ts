import { compare } from '../compare';

describe('compare', () => {
  it('returns 0 for equal numbers', () => {
    expect(compare(1, 1)).toBe(0);
    expect(compare(0, 0)).toBe(0);
    expect(compare(-5, -5)).toBe(0);
  });

  it('returns positive for first number greater, negative for second greater', () => {
    expect(compare(2, 1)).toBeGreaterThan(0);
    expect(compare(1, 2)).toBeLessThan(0);
  });

  it('returns 0 for equal strings', () => {
    expect(compare('a', 'a')).toBe(0);
    expect(compare('', '')).toBe(0);
  });

  it('returns positive for first string greater, negative for second greater', () => {
    expect(compare('b', 'a')).toBeGreaterThan(0);
    expect(compare('a', 'b')).toBeLessThan(0);
  });

  it('returns 0 for equal dates', () => {
    const d1 = new Date('2023-01-01');
    const d2 = new Date('2023-01-01');
    expect(compare(d1, d2)).toBe(0);
  });

  it('returns positive for first date greater, negative for second greater', () => {
    const d1 = new Date('2023-01-02');
    const d2 = new Date('2023-01-01');
    expect(compare(d1, d2)).toBeGreaterThan(0);
    expect(compare(d2, d1)).toBeLessThan(0);
  });

  it('returns 0 for equal objects', () => {
    expect(compare({ a: 1 }, { a: 1 })).toBe(0);
    expect(compare([1, 2], [1, 2])).toBe(0);
  });

  it('returns positive or negative for different objects', () => {
    expect(compare({ a: 2 }, { a: 1 })).toBeGreaterThan(0);
    expect(compare({ a: 1 }, { a: 2 })).toBeLessThan(0);
    expect(compare([2, 1], [1, 2])).not.toBe(0);
  });

  it('returns 1 if first value is undefined', () => {
    expect(compare(undefined, 1)).toBe(1);
    expect(compare(undefined, 'a')).toBe(1);
  });

  it('returns -1 if second value is undefined', () => {
    expect(compare(1, undefined)).toBe(-1);
    expect(compare('a', undefined)).toBe(-1);
  });

  it('returns 0 for different types not handled explicitly', () => {
    expect(compare(1, '1')).toBe(0);
  });
});
