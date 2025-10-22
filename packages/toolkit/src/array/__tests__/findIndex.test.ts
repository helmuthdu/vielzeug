import { findIndex } from '../findIndex';

describe('findIndex', () => {
  it('should return the index of the first matching element', () => {
    const arr = [1, 2, 3, 4, 5];
    const isEven = (n: number) => n % 2 === 0;
    expect(findIndex(arr, isEven)).toBe(1);
  });

  it('should return -1 if no element matches', () => {
    const arr = [1, 3, 5];
    expect(findIndex(arr, (n) => n > 10)).toBe(-1);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(findIndex(arr, (item) => item.a === 2)).toBe(1);
  });

  it('should return -1 for an empty array', () => {
    expect(findIndex([], () => true)).toBe(-1);
  });

  it('should pass index and array to the predicate', () => {
    const arr = [10, 20, 30];
    let called = false;
    findIndex(arr, (_value, index, array) => {
      called = true;
      expect(array).toBe(arr);
      expect(typeof index).toBe('number');
      return false;
    });
    expect(called).toBe(true);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => findIndex(null, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => findIndex(undefined, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => findIndex({}, () => true)).toThrow(TypeError);
  });
});
