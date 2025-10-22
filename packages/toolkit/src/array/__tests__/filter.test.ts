import { filter } from '../filter';

describe('filter', () => {
  it('should filter numbers based on a predicate', () => {
    const arr = [1, 2, 3, 4, 5];
    const isEven = (n: number) => n % 2 === 0;
    expect(filter(arr, isEven)).toEqual([2, 4]);
  });

  it('should filter objects by property', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const pred = (item: { a: number }) => item.a > 1;
    expect(filter(arr, pred)).toEqual([{ a: 2 }, { a: 3 }]);
  });

  it('should return an empty array if no elements match', () => {
    const arr = [1, 3, 5];
    const isEven = (n: number) => n % 2 === 0;
    expect(filter(arr, isEven)).toEqual([]);
  });

  it('should return an empty array for an empty input array', () => {
    expect(filter([], () => true)).toEqual([]);
  });

  it('should pass index and array to the predicate', () => {
    const arr = [10, 20, 30];
    const result: number[] = [];
    filter(arr, (_value, index, array) => {
      result.push(index + array.length);
      return false;
    });
    expect(result).toEqual([3, 4, 5]);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => filter(null, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => filter(undefined, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => filter({}, () => true)).toThrow(TypeError);
  });
});
