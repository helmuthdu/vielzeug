import { indexBy } from '../indexBy';

describe('indexBy', () => {
  it('should key objects by a selector', () => {
    const data = [
      { a: 'x', v: 1 },
      { a: 'y', v: 2 },
      { a: 'x', v: 3 },
    ];
    const result = indexBy(data, (item) => item.a);

    expect(result).toEqual({
      x: { a: 'x', v: 3 },
      y: { a: 'y', v: 2 },
    });
  });

  it('should key objects by a selector function', () => {
    const data = [
      { a: 'foo', v: 1 },
      { a: 'bar', v: 2 },
    ];
    const result = indexBy(data, (item) => item.a);

    expect(result).toEqual({
      bar: { a: 'bar', v: 2 },
      foo: { a: 'foo', v: 1 },
    });
  });

  it('should return an empty object for an empty array', () => {
    expect(indexBy([], (item: { a: string }) => item.a)).toEqual({});
  });

  it('should use the last occurrence for duplicate keys', () => {
    const data = [
      { a: 'z', v: 1 },
      { a: 'z', v: 2 },
    ];
    const result = indexBy(data, (item) => item.a);

    expect(result).toEqual({ z: { a: 'z', v: 2 } });
  });

  it('should throw TypeError if input is not an array', () => {
    const selector = (item: { a: string }) => item.a;

    expect(() => indexBy(null as any, selector)).toThrow(TypeError);
    expect(() => indexBy(undefined as any, selector)).toThrow(TypeError);
    expect(() => indexBy({} as any, selector)).toThrow(TypeError);
  });

  it('should work with numeric string keys', () => {
    const data = [
      { id: '1', v: 1 },
      { id: '2', v: 2 },
    ];
    const result = indexBy(data, (item) => item.id);

    expect(result).toEqual({ '1': { id: '1', v: 1 }, '2': { id: '2', v: 2 } });
  });

  it('should work with selector function returning a string', () => {
    const data = [{ a: 1 }, { a: 2 }];
    const result = indexBy(data, (item) => String(item.a));

    expect(result).toEqual({ '1': { a: 1 }, '2': { a: 2 } });
  });
});
