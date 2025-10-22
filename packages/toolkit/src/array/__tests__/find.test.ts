import { find } from '../find';

describe('find', () => {
  it('should find the first matching element', () => {
    const arr = [1, 2, 3, 4, 5];
    const isEven = (n: number) => n % 2 === 0;
    expect(find(arr, isEven)).toBe(2);
  });

  it('should return undefined if no element matches and no default is provided', () => {
    const arr = [1, 3, 5];
    expect(find(arr, (n) => n > 10)).toBeUndefined();
  });

  it('should return the default value if no element matches', () => {
    const arr = [1, 3, 5];
    expect(find(arr, (n) => n > 10, 0)).toBe(0);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(find(arr, (item) => item.a === 2)).toEqual({ a: 2 });
  });

  it('should return undefined for an empty array without default', () => {
    expect(find([], () => true)).toBeUndefined();
  });

  it('should return default for an empty array with default', () => {
    expect(find([], () => true, 'default')).toBe('default');
  });

  it('should pass index and array to the predicate', () => {
    const arr = [10, 20, 30];
    let called = false;
    find(arr, (_value, index, array) => {
      called = true;
      expect(array).toBe(arr);
      expect(typeof index).toBe('number');
      return false;
    });
    expect(called).toBe(true);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => find(null, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => find(undefined, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => find({}, () => true)).toThrow(TypeError);
  });
});
