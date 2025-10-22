import { entries } from '../entries';

describe('entries', () => {
  it('should return entries of a simple object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(entries(obj)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('should return entries of an object with string and number entries', () => {
    const obj = { a: 'x', b: 42, c: null };
    expect(entries(obj)).toEqual([
      ['a', 'x'],
      ['b', 42],
      ['c', null],
    ]);
  });

  it('should return an empty array for an empty object', () => {
    expect(entries({})).toEqual([]);
  });

  it('should ignore inherited properties', () => {
    const proto = { x: 1 };
    const obj = Object.create(proto);
    obj.a = 2;
    expect(entries(obj)).toEqual([['a', 2]]);
  });

  it('should throw TypeError if input is not an object', () => {
    // @ts-expect-error
    expect(() => entries(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => entries(undefined)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => entries(42)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => entries('string')).toThrow(TypeError);
  });
});
