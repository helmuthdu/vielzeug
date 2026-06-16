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

  it('should work with a bound contains predicate', () => {
    const array = [1, 2, 3, { a: 1 }, 'hello'];
    const value = { a: 1 };
    const containsInArray = (v: unknown) => contains(array, v);

    expect(containsInArray(value)).toBe(true);
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
