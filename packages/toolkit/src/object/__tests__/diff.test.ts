import { diff } from '../diff';

describe('diff', () => {
  it('should return an empty object if both inputs are undefined', () => {
    expect(diff()).toEqual({});
  });

  it('should return the current object if the previous object is undefined', () => {
    const curr = { a: 1, b: 2 };
    expect(diff(curr)).toEqual(curr);
  });

  it('should return an empty object if both objects are equal', () => {
    const obj = { a: 1, b: 2 };
    expect(diff(obj, obj)).toEqual({});
  });

  it('should return the difference between two objects', () => {
    const curr = { a: 1, b: 2, c: 3 };
    const prev = { b: 2, c: 3, d: 4 };
    // @ts-ignore
    expect(diff(curr, prev)).toEqual({ a: 1, d: undefined });
  });

  it('should handle nested objects', () => {
    const curr = { a: { x: 1, y: 2 }, b: 2 };
    const prev = { a: { x: 1, y: 3 }, b: 2 };
    expect(diff(curr, prev)).toEqual({ a: { y: 2 } });
  });

  it('should use a custom comparator if provided', () => {
    const curr = { a: 1, b: 2 };
    const prev = { a: 1, b: '2' };
    // biome-ignore lint/suspicious/noDoubleEquals: -
    const comparator = (a: unknown, b: unknown) => a == b; // Loose equality
    // @ts-ignore
    expect(diff(curr, prev, comparator)).toEqual({});
  });

  it('should handle cases where keys are added or removed', () => {
    const curr = { a: 1, b: 2 };
    const prev = { b: 2, c: 3 };
    // @ts-ignore
    expect(diff(curr, prev)).toEqual({ a: 1, c: undefined });
  });
});
