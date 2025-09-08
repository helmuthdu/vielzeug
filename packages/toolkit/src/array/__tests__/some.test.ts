import { some } from '../some';

describe('some', () => {
  it('should return true if at least one element matches the predicate', () => {
    const arr = [1, 2, 3];
    expect(some(arr, (n) => n === 2)).toBe(true);
  });

  it('should return false if no elements match the predicate', () => {
    const arr = [1, 2, 3];
    expect(some(arr, (n) => n === 4)).toBe(false);
  });

  it('should return false for an empty array', () => {
    expect(some([], () => true)).toBe(false);
  });

  it('should pass value, index, and array to the predicate', () => {
    const arr = [10, 20, 30];
    const mockPredicate = vi.fn().mockReturnValue(false);
    some(arr, mockPredicate);
    expect(mockPredicate).toHaveBeenCalledWith(10, 0, arr);
    expect(mockPredicate).toHaveBeenCalledWith(20, 1, arr);
    expect(mockPredicate).toHaveBeenCalledWith(30, 2, arr);
  });

  it('should stop iterating once predicate returns true', () => {
    const arr = [1, 2, 3, 4];
    const mockPredicate = vi.fn((n: number) => n === 3);
    some(arr, mockPredicate);
    expect(mockPredicate).toHaveBeenCalledTimes(3);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }];
    expect(some(arr, (obj) => obj.a === 2)).toBe(true);
    expect(some(arr, (obj) => obj.a === 3)).toBe(false);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => some(null, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => some(undefined, () => true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => some({}, () => true)).toThrow(TypeError);
  });
});
