import { ValidationError, s } from '../index';

describe('s.boolean()', () => {
  it('accepts true and false', () => {
    expect(s.boolean().parse(true)).toBe(true);
    expect(s.boolean().parse(false)).toBe(false);
  });

  it('rejects truthy/falsy non-booleans', () => {
    for (const val of [1, 0, 'true', null]) {
      expect(() => s.boolean().parse(val)).toThrow(ValidationError);
    }
  });
});

describe('coerce.boolean()', () => {
  it('coerces "true"/1 to true and "false"/0 to false', () => {
    expect(s.coerce.boolean().parse('true')).toBe(true);
    expect(s.coerce.boolean().parse(1)).toBe(true);
    expect(s.coerce.boolean().parse('false')).toBe(false);
    expect(s.coerce.boolean().parse(0)).toBe(false);
  });

  it('rejects unrecognised values', () => {
    expect(() => s.coerce.boolean().parse('yes')).toThrow();
  });

  it('coerces "1" to true and "0" to false', () => {
    expect(s.coerce.boolean().parse('1')).toBe(true);
    expect(s.coerce.boolean().parse('0')).toBe(false);
  });

  it('still handles numeric 1 and 0', () => {
    expect(s.coerce.boolean().parse(1)).toBe(true);
    expect(s.coerce.boolean().parse(0)).toBe(false);
  });
});
