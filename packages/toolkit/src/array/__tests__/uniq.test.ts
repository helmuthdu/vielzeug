import { uniq } from '../uniq';

describe('uniq', () => {
  it('should work with primitive values', () => {
    expect(uniq([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('should work with objects and a key', () => {
    const arrObj = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }, { id: 3 }, { id: 3 }];
    expect(uniq(arrObj, 'id')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('should work with a custom function', () => {
    const arrObj = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }, { id: 3 }, { id: 3 }];
    expect(uniq(arrObj, (item) => item.id)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('should throw TypeError for non-array input', () => {
    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => uniq(null as any)).toThrow(TypeError);
  });

  it('should return an empty array for empty input', () => {
    expect(uniq([])).toEqual([]);
  });

  it('should return the same array for input with one element', () => {
    expect(uniq([1])).toEqual([1]);
  });

  it('should work with complex objects and nested properties', () => {
    const complexArr = [
      { user: { id: 1, name: 'Alice' } },
      { user: { id: 2, name: 'Bob' } },
      { user: { id: 1, name: 'Alice' } },
      { user: { id: 3, name: 'Charlie' } },
    ];
    expect(uniq(complexArr, (item) => item.user.id)).toEqual([
      { user: { id: 1, name: 'Alice' } },
      { user: { id: 2, name: 'Bob' } },
      { user: { id: 3, name: 'Charlie' } },
    ]);
  });

  it('should handle NaN values correctly', () => {
    const nanArr = [Number.NaN, 1, Number.NaN, 2, 3, Number.NaN];
    expect(uniq(nanArr)).toEqual([Number.NaN, 1, 2, 3]);
  });
});
