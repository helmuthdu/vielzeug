import { aggregate } from '../aggregate';

describe('aggregate', () => {
  it('should aggregate objects by a string property key', () => {
    const data = [
      { a: 'x', v: 1 },
      { a: 'y', v: 2 },
      { a: 'x', v: 3 },
    ];
    const result = aggregate(data, 'a');
    expect(result).toEqual({
      x: { a: 'x', v: 3 }, // last with a: 'x'
      y: { a: 'y', v: 2 },
    });
  });

  it('should aggregate objects by a selector function', () => {
    const data = [
      { a: 'foo', v: 1 },
      { a: 'bar', v: 2 },
    ];
    const result = aggregate(data, (item) => item.a);
    expect(result).toEqual({
      bar: { a: 'bar', v: 2 },
      foo: { a: 'foo', v: 1 },
    });
  });

  it('should return an empty object for an empty array', () => {
    expect(aggregate([], 'a')).toEqual({});
  });

  it('should use the last occurrence for duplicate keys', () => {
    const data = [
      { a: 'z', v: 1 },
      { a: 'z', v: 2 },
    ];
    const result = aggregate(data, 'a');
    expect(result).toEqual({ z: { a: 'z', v: 2 } });
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => aggregate(null, 'a')).toThrow(TypeError);
    // @ts-expect-error
    expect(() => aggregate(undefined, 'a')).toThrow(TypeError);
    // @ts-expect-error
    expect(() => aggregate({}, 'a')).toThrow(TypeError);
  });

  it('should work with numeric string keys', () => {
    const data = [
      { id: '1', v: 1 },
      { id: '2', v: 2 },
    ];
    const result = aggregate(data, 'id');
    expect(result).toEqual({ '1': { id: '1', v: 1 }, '2': { id: '2', v: 2 } });
  });

  it('should work with selector function returning a string', () => {
    const data = [{ a: 1 }, { a: 2 }];
    const result = aggregate(data, (item) => String(item.a));
    expect(result).toEqual({ '1': { a: 1 }, '2': { a: 2 } });
  });
});
