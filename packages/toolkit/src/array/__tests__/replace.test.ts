import { replace } from '../replace';

describe('replace', () => {
  it('should replace the first matching element', () => {
    const arr = [1, 2, 3, 2];
    const result = replace(arr, (n) => n === 2, 99);

    expect(result).toEqual([1, 99, 3, 2]);
  });

  it('should return the original array if no element matches', () => {
    const arr = [1, 2, 3];
    const result = replace(arr, (n) => n === 42, 99);

    expect(result).toBe(arr);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = replace(arr, (obj) => obj.a === 2, { a: 42 });

    expect(result).toEqual([{ a: 1 }, { a: 42 }, { a: 3 }]);
  });

  it('should return a new array when replacement occurs', () => {
    const arr = [1, 2, 3];
    const result = replace(arr, (n) => n === 2, 4);

    expect(result).not.toBe(arr);
  });

  it('should handle empty arrays', () => {
    const arr: number[] = [];
    const result = replace(arr, () => true, 1);

    expect(result).toEqual([]);
  });

  it('should replace the first element if it matches', () => {
    const arr = [5, 2, 3];
    const result = replace(arr, (n) => n === 5, 0);

    expect(result).toEqual([0, 2, 3]);
  });

  it('should replace the last element if it matches', () => {
    const arr = [1, 2, 3];
    const result = replace(arr, (n) => n === 3, 9);

    expect(result).toEqual([1, 2, 9]);
  });

  it('should throw TypeError if input is not an array', () => {
    expect(() => replace(null as any, () => true, 1)).toThrow(TypeError);
    expect(() => replace(undefined as any, () => true, 1)).toThrow(TypeError);
    expect(() => replace({} as any, () => true, 1)).toThrow(TypeError);
  });
});
