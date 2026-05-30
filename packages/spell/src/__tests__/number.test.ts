import { ValidationError, s } from '../index';

describe('s.number()', () => {
  it('accepts numbers', () => {
    expect(s.number().parse(0)).toBe(0);
    expect(s.number().parse(-3.14)).toBe(-3.14);
  });

  it('rejects non-numbers and NaN', () => {
    for (const val of ['1', true, null, Number.NaN]) {
      expect(() => s.number().parse(val)).toThrow(ValidationError);
    }
  });

  it('min / max / int / positive / negative / nonNegative / nonPositive', () => {
    expect(s.number().min(0).parse(0)).toBe(0);
    expect(() => s.number().min(1).parse(0)).toThrow('Must be at least 1');

    expect(s.number().max(5).parse(5)).toBe(5);
    expect(() => s.number().max(5).parse(6)).toThrow('Must be at most 5');

    expect(s.number().int().parse(3)).toBe(3);
    expect(() => s.number().int().parse(3.14)).toThrow('Must be an integer');

    expect(() => s.number().positive().parse(0)).toThrow('Must be positive');
    expect(s.number().positive().parse(0.1)).toBe(0.1);

    expect(() => s.number().negative().parse(0)).toThrow('Must be negative');
    expect(s.number().negative().parse(-0.1)).toBe(-0.1);

    expect(s.number().nonNegative().parse(0)).toBe(0);
    expect(() => s.number().nonNegative().parse(-1)).toThrow();

    expect(s.number().nonPositive().parse(0)).toBe(0);
    expect(() => s.number().nonPositive().parse(1)).toThrow();
  });

  it('multipleOf validates integer steps', () => {
    expect(s.number().multipleOf(3).parse(9)).toBe(9);
    expect(() => s.number().multipleOf(3).parse(8)).toThrow();
  });

  it('multipleOf handles decimal steps correctly', () => {
    expect(s.number().multipleOf(0.1).parse(0.3)).toBe(0.3);
    expect(s.number().multipleOf(0.5).parse(1.5)).toBe(1.5);
    expect(() => s.number().multipleOf(0.1).parse(0.31)).toThrow();
  });
});

describe('coerce.number()', () => {
  it('coerces numeric strings, rejects non-numeric', () => {
    expect(s.coerce.number().int().parse('42')).toBe(42);
    expect(() => s.coerce.number().parse('abc')).toThrow();
  });

  it('preserves actual numbers and chains constraints', () => {
    expect(s.coerce.number().positive().parse(3)).toBe(3);
  });
});
