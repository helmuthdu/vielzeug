import { keys } from '../keys';

describe('keys', () => {
  it('should return keys of a simple object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(keys(obj)).toEqual(['a', 'b', 'c']);
  });

  it('should return keys of an object with string and number keys', () => {
    const obj = { a: 'x', b: 42, c: null };
    expect(keys(obj)).toEqual(['a', 'b', 'c']);
  });

  it('should return an empty array for an empty object', () => {
    expect(keys({})).toEqual([]);
  });

  it('should ignore inherited properties', () => {
    const proto = { x: 1 };
    const obj = Object.create(proto);
    obj.a = 2;
    expect(keys(obj)).toEqual(['a']);
  });

  it('should throw TypeError if input is not an object', () => {
    // @ts-expect-error
    expect(() => keys(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => keys(undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => keys(42)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => keys('string')).toThrow(TypeError);
  });
});
