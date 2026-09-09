import { s } from '../index';

describe('s.coerce.string()', () => {
  it('coerces numbers and booleans to string', () => {
    expect(s.coerce.string().parse(42)).toBe('42');
    expect(s.coerce.string().parse(true)).toBe('true');
    expect(s.coerce.string().parse(false)).toBe('false');
  });

  it('passes strings through unchanged', () => {
    expect(s.coerce.string().parse('hello')).toBe('hello');
  });

  it('does not coerce null/undefined', () => {
    expect(() => s.coerce.string().parse(null)).toThrow();
    expect(() => s.coerce.string().parse(undefined)).toThrow();
  });

  it('applies string constraints after coercion', () => {
    expect(s.coerce.string().min(2).parse(99)).toBe('99');
    expect(() => s.coerce.string().min(5).parse(1)).toThrow();
  });
});

describe('s.coerce.number()', () => {
  it('coerces strings to numbers', () => {
    expect(s.coerce.number().parse('3.14')).toBe(3.14);
    expect(s.coerce.number().parse('0')).toBe(0);
  });

  it('coerces booleans to numbers', () => {
    expect(s.coerce.number().parse(true)).toBe(1);
    expect(s.coerce.number().parse(false)).toBe(0);
  });

  it('applies number constraints after coercion', () => {
    expect(s.coerce.number().int().parse('7')).toBe(7);
    expect(() => s.coerce.number().min(10).parse('5')).toThrow();
  });
});

describe('s.coerce.boolean()', () => {
  it('coerces numeric 1 / string "true" / "1" to true', () => {
    expect(s.coerce.boolean().parse(1)).toBe(true);
    expect(s.coerce.boolean().parse('true')).toBe(true);
    expect(s.coerce.boolean().parse('1')).toBe(true);
  });

  it('coerces numeric 0 / string "false" / "0" to false', () => {
    expect(s.coerce.boolean().parse(0)).toBe(false);
    expect(s.coerce.boolean().parse('false')).toBe(false);
    expect(s.coerce.boolean().parse('0')).toBe(false);
  });

  it('passes boolean values through unchanged', () => {
    expect(s.coerce.boolean().parse(true)).toBe(true);
    expect(s.coerce.boolean().parse(false)).toBe(false);
  });

  it('rejects arbitrary strings that are not recognised', () => {
    expect(() => s.coerce.boolean().parse('yes')).toThrow();
    expect(() => s.coerce.boolean().parse('any')).toThrow();
  });
});

describe('s.coerce.bigint()', () => {
  it('coerces integer strings and numbers to bigint', () => {
    expect(s.coerce.bigint().parse('42')).toBe(42n);
    expect(s.coerce.bigint().parse(100)).toBe(100n);
  });

  it('rejects values that cannot be coerced', () => {
    expect(() => s.coerce.bigint().parse('not-a-number')).toThrow();
  });
});

describe('s.coerce.date()', () => {
  it('coerces ISO date strings to Date instances', () => {
    const result = s.coerce.date().parse('2024-01-15');

    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  it('coerces numeric timestamps to Date instances', () => {
    const ts = Date.now();
    const result = s.coerce.date().parse(ts);

    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ts);
  });

  it('passes existing Date instances through', () => {
    const d = new Date('2024-06-01');

    expect(s.coerce.date().parse(d)).toBeInstanceOf(Date);
  });
});
