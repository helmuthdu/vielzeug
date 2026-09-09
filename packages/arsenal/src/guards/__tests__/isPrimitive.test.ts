import { isPrimitive } from '../isPrimitive';

describe('isPrimitive', () => {
  it('accepts every JavaScript primitive type', () => {
    expect(isPrimitive('hello')).toBe(true);
    expect(isPrimitive(123)).toBe(true);
    expect(isPrimitive(Number.NaN)).toBe(true);
    expect(isPrimitive(1n)).toBe(true);
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive(Symbol('test'))).toBe(true);
    expect(isPrimitive(null)).toBe(true);
    expect(isPrimitive(undefined)).toBe(true);
  });

  it('rejects objects and functions', () => {
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive(new Date())).toBe(false);
    expect(isPrimitive(() => {})).toBe(false);
  });
});
