import { shift } from '../shift';

describe('shift', () => {
  it('should shift elements to the left by given positions (rotate=true)', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shift(arr, 2)).toEqual([3, 4, 5]);
  });

  it('should shift elements to the left by given positions (rotate=false)', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shift(arr, 2, true)).toEqual([3, 4, 5, 1, 2]);
  });

  it('should handle positions greater than array length', () => {
    const arr = [1, 2, 3];
    expect(shift(arr, 5)).toEqual([3]);
  });

  it('should handle negative positions (rotate=true)', () => {
    const arr = [1, 2, 3, 4];
    expect(shift(arr, -1, true)).toEqual([4, 1, 2, 3]);
  });

  it('should handle negative positions (rotate=false)', () => {
    const arr = [1, 2, 3, 4];
    expect(shift(arr, -2, false)).toEqual([3, 4]);
  });

  it('should return the same array if positions is 0', () => {
    const arr = [1, 2, 3];
    expect(shift(arr, 0)).toEqual([1, 2, 3]);
  });

  it('should return the same array if array is empty', () => {
    const arr: number[] = [];
    expect(shift(arr, 2)).toBe(arr);
  });

  it('should work with arrays of objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(shift(arr, 1)).toEqual([{ a: 2 }, { a: 3 }]);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => shift(null, 1)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => shift(undefined, 1)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => shift({}, 1)).toThrow(TypeError);
  });

  it('should throw TypeError if positions is not a number', () => {
    // @ts-expect-error
    expect(() => shift([1, 2, 3], null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => shift([1, 2, 3], undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => shift([1, 2, 3], {})).toThrow(TypeError);
  });
});
