import { shallowEqual } from '../shallowEqual';

describe('shallowEqual', () => {
  it('returns true for identical primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('hello', 'hello')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual('a', 'b')).toBe(false);
  });

  it('returns true for same-reference nested objects', () => {
    const inner = { x: 1 };

    expect(shallowEqual({ a: inner }, { a: inner })).toBe(true);
  });

  it('returns false for different-reference nested objects', () => {
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });

  it('returns true for identical primitive-valued objects', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false when key counts differ', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('handles array comparison element-by-reference', () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false when one is null', () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it('returns false comparing array with non-array', () => {
    expect(shallowEqual([], {})).toBe(false);
  });

  it('handles NaN via Object.is semantics', () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
    expect(shallowEqual(-0, +0)).toBe(false);
  });

  it('returns false for objects with different values', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});
