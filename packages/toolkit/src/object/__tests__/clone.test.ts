import { clone } from '../clone';

describe('clone', () => {
  it('should create a deep copy of an object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const result = clone(obj);

    expect(result).toEqual(obj);
    expect(result).not.toBe(obj); // Ensure it's a deep copy
    result.b.c = 3;
    expect(obj.b.c).toBe(2); // Original object remains unchanged
  });

  it('should create a deep copy of an array', () => {
    const arr = [1, 2, { a: 3 }];
    const result = clone(arr);

    expect(result).toEqual(arr);
    expect(result).not.toBe(arr); // Ensure it's a deep copy
    // @ts-ignore
    result[2].a = 4;
    // @ts-ignore
    expect(arr[2].a).toBe(3); // Original array remains unchanged
  });

  it('should handle primitive values', () => {
    expect(clone(42)).toBe(42);
    expect(clone('hello')).toBe('hello');
    expect(clone(true)).toBe(true);
  });

  it('should return null for null input', () => {
    expect(clone(null)).toBeNull();
  });

  it('should return undefined for undefined input', () => {
    expect(clone(undefined)).toBeUndefined();
  });
});
