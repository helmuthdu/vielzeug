import { isMatch } from '../isMatch';

describe('isMatch', () => {
  it('returns true for identical objects', () => {
    const obj = { a: 1, b: 2 };
    expect(isMatch(obj, obj)).toBe(true);
  });

  it('returns true for shallow partial match', () => {
    expect(isMatch({ a: 1, b: 2 }, { a: 1 })).toBe(true);
    expect(isMatch({ a: 1, b: 2 }, { b: 2 })).toBe(true);
  });

  it('returns false for shallow mismatch', () => {
    expect(isMatch({ a: 1, b: 2 }, { a: 2 })).toBe(false);
    expect(isMatch({ a: 1, b: 2 }, { c: 3 })).toBe(false);
  });

  it('returns true for deep partial match', () => {
    const obj = { a: 1, b: { c: 2, d: 3 } };
    expect(isMatch(obj, { b: { c: 2 } })).toBe(true);
    expect(isMatch(obj, { a: 1, b: { d: 3 } })).toBe(true);
  });

  it('returns false for deep mismatch', () => {
    const obj = { a: 1, b: { c: 2, d: 3 } };
    expect(isMatch(obj, { b: { c: 3 } })).toBe(false);
    expect(isMatch(obj, { b: { e: 4 } })).toBe(false);
  });

  it('returns true for empty source', () => {
    expect(isMatch({ a: 1 }, {})).toBe(true);
    expect(isMatch({}, {})).toBe(true);
  });

  it('returns false if object is null or undefined', () => {
    expect(isMatch(null, { a: 1 })).toBe(false);
    expect(isMatch(undefined, { a: 1 })).toBe(false);
  });

  it('returns false if source is null or undefined', () => {
    expect(isMatch({ a: 1 }, null)).toBe(false);
    expect(isMatch({ a: 1 }, undefined)).toBe(false);
  });

  it('handles arrays as values', () => {
    expect(isMatch({ a: [1, 2, 3] }, { a: [1, 2, 3] })).toBe(true);
    expect(isMatch({ a: [1, 2, 3] }, { a: [1, 2] })).toBe(false);
  });

  it('handles nested objects and arrays', () => {
    const obj = { a: { b: [1, 2, { c: 3 }] } };
    expect(isMatch(obj, { a: { b: [1, 2, { c: 3 }] } })).toBe(true);
    expect(isMatch(obj, { a: { b: [1, 2, { c: 4 }] } })).toBe(false);
  });

  it('ignores properties not in source', () => {
    expect(isMatch({ a: 1, b: 2, c: 3 }, { a: 1, c: 3 })).toBe(true);
  });
});
