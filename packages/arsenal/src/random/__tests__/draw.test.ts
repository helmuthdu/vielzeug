import { draw } from '../draw';

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
