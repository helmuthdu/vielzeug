import { values } from '../values';

describe('values', () => {
  it('should return values of a simple object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(values(obj)).toEqual([1, 2, 3]);
  });

  it('should return values of an object with string and number values', () => {
    const obj = { a: 'x', b: 42, c: null };
    expect(values(obj)).toEqual(['x', 42, null]);
  });

  it('should return an empty array for an empty object', () => {
    expect(values({})).toEqual([]);
  });

  it('should ignore inherited properties', () => {
    const proto = { x: 1 };
    const obj = Object.create(proto);
    obj.a = 2;
    expect(values(obj)).toEqual([2]);
  });

  it('should throw TypeError if input is not an object', () => {
    // @ts-expect-error
    expect(() => values(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => values(undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => values(42)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => values('string')).toThrow(TypeError);
  });
});
