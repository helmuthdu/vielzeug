import { fp } from '../../function/fp';
import { contains } from '../contains';

describe('contains', () => {
  it('should return true if the value is present in the array', () => {
    const array = [1, 2, 3, { a: 1 }, 'hello'];
    const value = { a: 1 };

    expect(contains(array, value)).toBe(true);
  });

  it('should return false if the value is not present in the array', () => {
    const array = [1, 2, 3, { a: 1 }, 'hello'];
    const value = { b: 2 };

    expect(contains(array, value)).toBe(false);
  });

  it('should return true for primitive values present in the array', () => {
    const array = [1, 2, 3, 'hello'];
    const value = 2;

    expect(contains(array, value)).toBe(true);
  });

  it('should return false for primitive values not present in the array', () => {
    const array = [1, 2, 3, 'hello'];
    const value = 4;

    expect(contains(array, value)).toBe(false);
  });

  it('should throw a TypeError if the first argument is not an array', () => {
    const notArray = 'not an array';
    const value = 1;

    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => contains(notArray as unknown as any, value)).toThrow(TypeError);
  });

  it('should work with the contains in fp mode', () => {
    const array = [1, 2, 3, { a: 1 }, 'hello'];
    const value = { a: 1 };
    const containsValue = fp(contains, value);

    expect(containsValue(array)).toBe(true);
  });

  it('should return false for an empty array', () => {
    const array: unknown[] = [];
    const value = 1;

    expect(contains(array, value)).toBe(false);
  });

  it('should handle arrays with mixed types', () => {
    const array = [1, '2', true, { a: 1 }];
    const value = true;

    expect(contains(array, value)).toBe(true);
  });
});
