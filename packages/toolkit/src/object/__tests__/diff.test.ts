import { DELETED, diff } from '../diff';

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
    const curr: any = { a: 1, b: 2, c: 3 };
    const prev: any = { b: 2, c: 3, d: 4 };

    expect(diff(curr, prev)).toEqual({ a: 1, d: DELETED });
  });

  it('should handle nested objects', () => {
    const curr: any = { a: { x: 1, y: 2 }, b: 2 };
    const prev: any = { a: { x: 1, y: 3 }, b: 2 };

    expect(diff(curr, prev)).toEqual({ a: { y: 2 } });
  });

  it('should use a custom comparator if provided', () => {
    const curr: any = { a: 1, b: 2 };
    const prev: any = { a: 1, b: '2' };
    const comparator = (a: unknown, b: unknown) => a == b; // Loose equality

    expect(diff(curr, prev, comparator)).toEqual({});
  });

  it('should handle cases where keys are added or removed', () => {
    const curr: any = { a: 1, b: 2 };
    const prev: any = { b: 2, c: 3 };

    expect(diff(curr, prev)).toEqual({ a: 1, c: DELETED });
  });
});
