import { groupBy } from '../groupBy';

describe('groupBy', () => {
  it('should group objects by a property selector', () => {
    const arr = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 },
    ];

    expect(groupBy(arr, (item) => item.type)).toEqual({
      a: [
        { type: 'a', value: 1 },
        { type: 'a', value: 3 },
      ],
      b: [{ type: 'b', value: 2 }],
    });
  });

  it('should group objects by a selector function', () => {
    const arr = [{ score: 10 }, { score: 20 }, { score: 10 }];
    const selector = (item: { score: number }) => String(item.score);

    expect(groupBy(arr, selector)).toEqual({
      '10': [{ score: 10 }, { score: 10 }],
      '20': [{ score: 20 }],
    });
  });

  it('should return an empty object for an empty array', () => {
    expect(groupBy([], (item: { type: string }) => item.type)).toEqual({});
  });

  it('should handle grouping by a property with undefined or null values', () => {
    const arr = [{ a: undefined }, { a: 'x' }, { a: null }];

    expect(groupBy(arr, (item) => item.a as any)).toEqual({
      _: [{ a: undefined }, { a: null }],
      x: [{ a: 'x' }],
    });
  });

  it('should throw TypeError if input is not an array', () => {
    const selector = (item: { a: string }) => item.a;

    expect(() => groupBy(null as any, selector)).toThrow(TypeError);
    expect(() => groupBy(undefined as any, selector)).toThrow(TypeError);
    expect(() => groupBy({} as any, selector)).toThrow(TypeError);
  });

  it('guards against __proto__ prototype pollution — security regression', () => {
    const arr = [{ type: '__proto__' }, { type: 'safe' }];
    const result = groupBy(arr, (item) => item.type);

    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
});
