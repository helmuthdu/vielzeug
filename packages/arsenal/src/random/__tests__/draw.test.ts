import { draw, drawMany } from '../draw';

describe('draw', () => {
  it('returns undefined for an empty array', () => {
    expect(draw([])).toBeUndefined();
  });

  it('returns the only element from a single-element array', () => {
    expect(draw([42])).toBe(42);
  });

  it('returns an element that exists in the array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = draw(arr);

    expect(arr).toContain(result);
  });

  it('works with string arrays', () => {
    const arr = ['a', 'b', 'c'];

    expect(arr).toContain(draw(arr));
  });

  it('works with object arrays', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const result = draw(arr);

    expect(arr).toContain(result);
  });
});

describe('drawMany', () => {
  it('draws unique values without exceeding bounds', () => {
    const result = drawMany([1, 2, 3, 4], 2);

    expect(result).toHaveLength(2);
    expect(new Set(result).size).toBe(2);
    expect(result.every((item) => [1, 2, 3, 4].includes(item))).toBe(true);
  });
});
