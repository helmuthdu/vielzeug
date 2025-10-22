import { fp } from '../../function/fp';
import { every } from '../every';

describe('every', () => {
  it('should return true if all elements satisfy the predicate', () => {
    const array = [2, 4, 6];
    const predicate = (value: number) => value % 2 === 0;

    expect(every(array, predicate)).toBe(true);
  });

  it('should return false if at least one element does not satisfy the predicate', () => {
    const array = [2, 3, 6];
    const predicate = (value: number) => value % 2 === 0;

    expect(every(array, predicate)).toBe(false);
  });

  it('should return true for an empty array (vacuous truth)', () => {
    const array: number[] = [];
    const predicate = (value: number) => value > 0;

    expect(every(array, predicate)).toBe(true);
  });

  it('should pass the correct arguments to the predicate', () => {
    const array = [10, 20, 30];
    const mockPredicate = vi.fn(() => true);

    every(array, mockPredicate);

    expect(mockPredicate).toHaveBeenCalledTimes(array.length);
    array.forEach((value, index) => {
      expect(mockPredicate).toHaveBeenCalledWith(value, index, array);
    });
  });

  it('should throw a TypeError if the first argument is not an array', () => {
    const notArray = 'not an array';
    const predicate = (value: number) => value > 0;

    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => every(notArray as unknown as any, predicate)).toThrow(TypeError);
  });

  it('should throw a TypeError if the predicate is not a function', () => {
    const array = [1, 2, 3];
    const notFunction = 'not a function';

    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => every(array, notFunction as unknown as any)).toThrow(TypeError);
  });
});

describe('fp.every', () => {
  it('should return a function that checks if all elements satisfy the predicate', () => {
    const array = [1, 2, 3];
    const predicate = (value: number) => value > 0;
    const everyWithPredicate = fp<number>(every, predicate);

    expect(everyWithPredicate(array)).toBe(true);
  });

  it('should return false if the predicate function fails for any element', () => {
    const array = [1, -2, 3];
    const predicate = (value: number) => value > 0;
    const everyWithPredicate = fp<number>(every, predicate);

    expect(everyWithPredicate(array)).toBe(false);
  });
});
