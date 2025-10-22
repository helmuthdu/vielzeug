import { min } from '../min';

describe('min', () => {
  it('returns the minimum number in an array', () => {
    expect(min([1, 2, 3])).toBe(1);
    expect(min([-1, -2, -3])).toBe(-3);
    expect(min([0, 0, 0])).toBe(0);
  });

  it('returns the minimum string in an array', () => {
    expect(min(['apple', 'banana', 'cherry'])).toBe('apple');
    expect(min(['zebra', 'ant', 'lion'])).toBe('ant');
  });

  it('returns the minimum value mapped by a callback function', () => {
    const array = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const callback = (item: { value: number }) => item.value;
    expect(min(array, callback)).toBe(array[0]);
  });

  it('handles arrays with mixed types using a callback', () => {
    const array = [true, false, true];
    const callback = (item: boolean) => (item ? 1 : 0);
    expect(min(array, callback)).toBe(false);
  });

  it('returns undefined for an empty array', () => {
    expect(min([])).toBeUndefined();
  });

  it('handles arrays with a mix of numbers and other types', () => {
    const array = [1, '2', true, null];
    const callback = (item: unknown) => (typeof item === 'number' ? item : Number.POSITIVE_INFINITY);
    expect(min(array, callback)).toBe(1);
  });

  it('works without a callback for arrays of numbers', () => {
    expect(min([10, 20, 30])).toBe(10);
  });

  it('handles arrays with undefined or null values', () => {
    const array = [1, null, undefined, 2];
    const callback = (item: unknown) => (item ? (item as number) : Number.POSITIVE_INFINITY);
    expect(min(array, callback)).toBe(1);
  });

  it('returns the first minimum if there are duplicates', () => {
    expect(min([2, 1, 1, 3])).toBe(1);
  });

  it('throws TypeError if the first argument is not an array', () => {
    // @ts-expect-error
    expect(() => min(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => min(undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => min(123)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => min({})).toThrow(TypeError);
    // @ts-expect-error
    expect(() => min('string')).toThrow(TypeError);
  });
});
