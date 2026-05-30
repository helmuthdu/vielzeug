import { rotate } from '../rotate';

describe('rotate', () => {
  it('should rotate elements to the left by given positions', () => {
    const arr = [1, 2, 3, 4, 5];

    expect(rotate(arr, 2)).toEqual([3, 4, 5]);
  });

  it('should rotate and wrap elements when wrap=true', () => {
    const arr = [1, 2, 3, 4, 5];

    expect(rotate(arr, 2, { wrap: true })).toEqual([3, 4, 5, 1, 2]);
  });

  it('should handle positions greater than array length', () => {
    const arr = [1, 2, 3];

    expect(rotate(arr, 5)).toEqual([3]);
  });

  it('should handle negative positions (wrap=true)', () => {
    const arr = [1, 2, 3, 4];

    expect(rotate(arr, -1, { wrap: true })).toEqual([4, 1, 2, 3]);
  });

  it('should handle negative positions (wrap=false)', () => {
    const arr = [1, 2, 3, 4];

    expect(rotate(arr, -2, { wrap: false })).toEqual([3, 4]);
  });

  it('should return the same array if positions is 0', () => {
    const arr = [1, 2, 3];

    expect(rotate(arr, 0)).toEqual([1, 2, 3]);
  });

  it('should return the same array if array is empty', () => {
    const arr: number[] = [];

    expect(rotate(arr, 2)).toBe(arr);
  });

  it('should work with arrays of objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];

    expect(rotate(arr, 1)).toEqual([{ a: 2 }, { a: 3 }]);
  });

  it('should throw TypeError if input is not an array', () => {
    expect(() => rotate(null as any, 1)).toThrow(TypeError);
    expect(() => rotate(undefined as any, 1)).toThrow(TypeError);
    expect(() => rotate({} as any, 1)).toThrow(TypeError);
  });

  it('should throw TypeError if positions is not a number', () => {
    expect(() => rotate([1, 2, 3], null as any)).toThrow(TypeError);
    expect(() => rotate([1, 2, 3], undefined as any)).toThrow(TypeError);
    expect(() => rotate([1, 2, 3], {} as any)).toThrow(TypeError);
  });
});
