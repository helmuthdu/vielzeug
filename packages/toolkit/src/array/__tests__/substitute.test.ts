import { substitute } from '../substitute';

describe('substitute', () => {
  it('should replace the first matching element', () => {
    const arr = [1, 2, 3, 2];
    const result = substitute(arr, (n) => n === 2, 99);
    expect(result).toEqual([1, 99, 3, 2]);
  });

  it('should return the original array if no element matches', () => {
    const arr = [1, 2, 3];
    const result = substitute(arr, (n) => n === 42, 99);
    expect(result).toBe(arr);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = substitute(arr, (obj) => obj.a === 2, { a: 42 });
    expect(result).toEqual([{ a: 1 }, { a: 42 }, { a: 3 }]);
  });

  it('should return a new array when replacement occurs', () => {
    const arr = [1, 2, 3];
    const result = substitute(arr, (n) => n === 2, 4);
    expect(result).not.toBe(arr);
  });

  it('should handle empty arrays', () => {
    const arr: number[] = [];
    const result = substitute(arr, () => true, 1);
    expect(result).toEqual([]);
  });

  it('should replace the first element if it matches', () => {
    const arr = [5, 2, 3];
    const result = substitute(arr, (n) => n === 5, 0);
    expect(result).toEqual([0, 2, 3]);
  });

  it('should replace the last element if it matches', () => {
    const arr = [1, 2, 3];
    const result = substitute(arr, (n) => n === 3, 9);
    expect(result).toEqual([1, 2, 9]);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => substitute(null, () => true, 1)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => substitute(undefined, () => true, 1)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => substitute({}, () => true, 1)).toThrow(TypeError);
  });
});
