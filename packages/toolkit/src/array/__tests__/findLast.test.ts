import { findLast } from '../findLast';

describe('findLast', () => {
  it('should find the last matching element', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const isEven = (n: number) => n % 2 === 0;
    expect(findLast(arr, isEven)).toBe(6);
  });

  it('should return undefined if no element matches and no default is provided', () => {
    const arr = [1, 3, 5];
    expect(findLast(arr, (n) => n > 10)).toBeUndefined();
  });

  it('should return the default value if no element matches', () => {
    const arr = [1, 3, 5];
    expect(findLast(arr, (n) => n > 10, 0)).toBe(0);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 2 }];
    expect(findLast(arr, (item) => item.a === 2)).toEqual({ a: 2 });
  });

  it('should return undefined for an empty array without default', () => {
    expect(findLast([], () => true)).toBeUndefined();
  });

  it('should return default for an empty array with default', () => {
    expect(findLast([], () => true, 'default')).toBe('default');
  });

  it('should pass index and array to the predicate', () => {
    const arr = [10, 20, 30];
    let called = false;
    findLast(arr, (_value, index, array) => {
      called = true;
      expect(array).toBe(arr);
      expect(typeof index).toBe('number');
      return false;
    });
    expect(called).toBe(true);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => findLast(null, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => findLast(undefined, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => findLast({}, () => true)).toThrow(TypeError);
  });
});
