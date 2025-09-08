import { group } from '../group';

describe('group', () => {
  it('should group objects by a string property', () => {
    const arr = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 },
    ];
    expect(group(arr, 'type')).toEqual({
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
    expect(group(arr, selector)).toEqual({
      '10': [{ score: 10 }, { score: 10 }],
      '20': [{ score: 20 }],
    });
  });

  it('should return an empty object for an empty array', () => {
    expect(group([], 'type')).toEqual({});
  });

  it('should handle grouping by a property with undefined values', () => {
    const arr = [{ a: undefined }, { a: 'x' }];
    expect(group(arr, 'a')).toEqual({
      _: [{ a: undefined }],
      x: [{ a: 'x' }],
    });
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => group(null, 'a')).toThrow(TypeError);
    // @ts-expect-error
    expect(() => group(undefined, 'a')).toThrow(TypeError);
    // @ts-expect-error
    expect(() => group({}, 'a')).toThrow(TypeError);
  });
});
