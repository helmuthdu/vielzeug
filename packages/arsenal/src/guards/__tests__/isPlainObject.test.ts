import { isPlainObject } from '../isPlainObject';

describe('isPlainObject', () => {
  it('returns true for plain object literals', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns true for Object.create(null)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it('returns false for class instances', () => {
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(new Set())).toBe(false);
    expect(isPlainObject(new Error())).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });

  it('returns false for primitives and null', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('str')).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it('returns false for functions', () => {
    expect(isPlainObject(() => {})).toBe(false);
  });
});
