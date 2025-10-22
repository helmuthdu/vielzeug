import { isWithin } from '../isWithin';

describe('isWithin', () => {
  it('returns true for a value is within the min and max', () => {
    expect(isWithin(0.5, 0, 1)).toBe(true);
  });

  it('returns true when value equals min', () => {
    expect(isWithin(0, 0, 1)).toBe(true);
  });

  it('returns true when value equals max', () => {
    expect(isWithin(1, 0, 1)).toBe(true);
  });

  it('returns false when value is less than min', () => {
    expect(isWithin(-1, 0, 1)).toBe(false);
  });

  it('returns false when value is greater than max', () => {
    expect(isWithin(2, 0, 1)).toBe(false);
  });

  it('returns false if arg is not a number', () => {
    expect(isWithin('1', 0, 1)).toBe(false);
    expect(isWithin(null, 0, 1)).toBe(false);
    expect(isWithin(undefined, 0, 1)).toBe(false);
    expect(isWithin({}, 0, 1)).toBe(false);
  });

  it('returns false if min is not a number', () => {
    expect(isWithin(1, '0', 1)).toBe(false);
    expect(isWithin(1, null, 1)).toBe(false);
    expect(isWithin(1, undefined, 1)).toBe(false);
    expect(isWithin(1, {}, 1)).toBe(false);
  });

  it('returns false if max is not a number', () => {
    expect(isWithin(1, 0, '1')).toBe(false);
    expect(isWithin(1, 0, null)).toBe(false);
    expect(isWithin(1, 0, undefined)).toBe(false);
    expect(isWithin(1, 0, {})).toBe(false);
  });

  it('returns true for negative ranges', () => {
    expect(isWithin(-2, -5, -1)).toBe(true);
    expect(isWithin(-5, -5, -1)).toBe(true);
    expect(isWithin(-1, -5, -1)).toBe(true);
    expect(isWithin(-6, -5, -1)).toBe(false);
    expect(isWithin(0, -5, -1)).toBe(false);
  });

  it('returns true for min and max being the same and arg equals them', () => {
    expect(isWithin(5, 5, 5)).toBe(true);
  });

  it('returns false for min and max being the same and arg not equal', () => {
    expect(isWithin(4, 5, 5)).toBe(false);
    expect(isWithin(6, 5, 5)).toBe(false);
  });
});
