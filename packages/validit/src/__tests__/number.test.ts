import { ValidationError, v } from '../index';

describe('v.number()', () => {
  it('accepts numbers', () => {
    expect(v.number().parse(0)).toBe(0);
    expect(v.number().parse(-3.14)).toBe(-3.14);
  });

  it('rejects non-numbers and NaN', () => {
    for (const val of ['1', true, null, Number.NaN]) {
      expect(() => v.number().parse(val)).toThrow(ValidationError);
    }
  });

  it('min / max / int / positive / negative / nonNegative / nonPositive', () => {
    expect(v.number().min(0).parse(0)).toBe(0);
    expect(() => v.number().min(1).parse(0)).toThrow('Must be at least 1');

    expect(v.number().max(5).parse(5)).toBe(5);
    expect(() => v.number().max(5).parse(6)).toThrow('Must be at most 5');

    expect(v.number().int().parse(3)).toBe(3);
    expect(() => v.number().int().parse(3.14)).toThrow('Must be an integer');

    expect(() => v.number().positive().parse(0)).toThrow('Must be positive');
    expect(v.number().positive().parse(0.1)).toBe(0.1);

    expect(() => v.number().negative().parse(0)).toThrow('Must be negative');
    expect(v.number().negative().parse(-0.1)).toBe(-0.1);

    expect(v.number().nonNegative().parse(0)).toBe(0);
    expect(() => v.number().nonNegative().parse(-1)).toThrow();

    expect(v.number().nonPositive().parse(0)).toBe(0);
    expect(() => v.number().nonPositive().parse(1)).toThrow();
  });

  it('multipleOf validates integer steps', () => {
    expect(v.number().multipleOf(3).parse(9)).toBe(9);
    expect(() => v.number().multipleOf(3).parse(8)).toThrow();
  });

  it('multipleOf handles decimal steps correctly', () => {
    expect(v.number().multipleOf(0.1).parse(0.3)).toBe(0.3);
    expect(v.number().multipleOf(0.5).parse(1.5)).toBe(1.5);
    expect(() => v.number().multipleOf(0.1).parse(0.31)).toThrow();
  });
});

describe('coerce.number()', () => {
  it('coerces numeric strings, rejects non-numeric', () => {
    expect(v.coerce.number().int().parse('42')).toBe(42);
    expect(() => v.coerce.number().parse('abc')).toThrow();
  });

  it('preserves actual numbers and chains constraints', () => {
    expect(v.coerce.number().positive().parse(3)).toBe(3);
  });
});
