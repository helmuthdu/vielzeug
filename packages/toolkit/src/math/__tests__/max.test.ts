import { max } from '../max';

describe('max', () => {
  it('returns the maximum number in an array', () => {
    expect(max([1, 2, 3])).toBe(3);
    expect(max([-1, -2, -3])).toBe(-1);
    expect(max([0, 0, 0])).toBe(0);
  });

  it('returns the maximum string in an array', () => {
    expect(max(['apple', 'banana', 'cherry'])).toBe('cherry');
    expect(max(['zebra', 'ant', 'lion'])).toBe('zebra');
  });

  it('returns the maximum value mapped by a callback function', () => {
    const array = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const callback = (item: { value: number }) => item.value;
    expect(max(array, callback)).toBe(array[2]);
  });

  it('handles arrays with mixed types using a callback', () => {
    const array = [true, false, true];
    const callback = (item: boolean) => (item ? 1 : 0);
    expect(max(array, callback)).toBe(true);
  });

  it('returns undefined for an empty array', () => {
    expect(max([])).toBeUndefined();
  });

  it('handles arrays with a mix of numbers and other types', () => {
    const array = [1, '2', true, null];
    const callback = (item: unknown) => (typeof item === 'number' ? item : 0);
    expect(max(array, callback)).toBe(1);
  });

  it('works without a callback for arrays of numbers', () => {
    expect(max([10, 20, 30])).toBe(30);
  });

  it('handles arrays with undefined or null values', () => {
    const array = [1, null, undefined, 2];
    const callback = (item: unknown) => (item ? (item as number) : 0);
    expect(max(array, callback)).toBe(2);
  });

  it('returns the first maximum if there are duplicates', () => {
    expect(max([2, 3, 3, 1])).toBe(3);
  });

  it('throws TypeError if the first argument is not an array', () => {
    // @ts-expect-error
    expect(() => max(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => max(undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => max(123)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => max({})).toThrow(TypeError);
    // @ts-expect-error
    expect(() => max('string')).toThrow(TypeError);
  });
});
