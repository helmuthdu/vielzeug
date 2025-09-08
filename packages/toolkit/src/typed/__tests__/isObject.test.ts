import { isObject } from '../isObject';

describe('isObject', () => {
  it('should return true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: 'value' })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isObject(42)).toBe(false);
    expect(isObject('string')).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });

  it('should return false for functions', () => {
    expect(isObject(() => {})).toBe(false);
    // biome-ignore lint/complexity/useArrowFunction: -
    expect(isObject(function () {})).toBe(false);
  });

  it('should return true for instances of classes', () => {
    class MyClass {}
    expect(isObject(new MyClass())).toBe(true);
  });

  it('should return true for objects created with Object.create(null)', () => {
    expect(isObject(Object.create(null))).toBe(true);
  });
});
