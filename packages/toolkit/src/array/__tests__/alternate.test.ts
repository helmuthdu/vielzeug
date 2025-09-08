import { alternate } from '../alternate';

describe('alternate', () => {
  it('should add an item if it does not exist (primitive)', () => {
    expect(alternate([1, 2, 3], 4)).toEqual([1, 2, 3, 4]);
  });

  it('should remove an item if it exists (primitive)', () => {
    expect(alternate([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('should add an object if it does not exist (with selector)', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const item = { id: 3 };
    expect(alternate(arr, item, (obj) => obj.id)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('should remove an object if it exists (with selector)', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const item = { id: 2 };
    expect(alternate(arr, item, (obj) => obj.id)).toEqual([{ id: 1 }]);
  });

  it('should prepend item if strategy is "prepend"', () => {
    expect(alternate([1, 2, 3], 4, undefined, { strategy: 'prepend' })).toEqual([4, 1, 2, 3]);
  });

  it('should append item if strategy is "append"', () => {
    expect(alternate([1, 2, 3], 4, undefined, { strategy: 'append' })).toEqual([1, 2, 3, 4]);
  });

  it('should default to append if strategy is not specified', () => {
    expect(alternate([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it('should not mutate the original array', () => {
    const arr = [1, 2, 3];
    alternate(arr, 4);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('should handle empty array by adding the item', () => {
    expect(alternate([], 1)).toEqual([1]);
  });

  it('should handle removing the only item in array', () => {
    expect(alternate([1], 1)).toEqual([]);
  });

  it('should work with complex selector logic', () => {
    const arr = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const item = { id: 2, name: 'c' };
    expect(alternate(arr, item, (obj) => obj.id)).toEqual([{ id: 1, name: 'a' }]);
  });

  it('should add item if selector returns different value', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const item = { id: 3 };
    expect(alternate(arr, item, (obj) => obj.id)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
});
