import { diffArrays } from '../diff';

describe('diffArrays', () => {
  it('returns added and removed items', () => {
    const result = diffArrays([1, 2, 3], [2, 3, 4]);

    expect(result.added).toEqual([4]);
    expect(result.removed).toEqual([1]);
  });

  it('returns empty arrays when inputs are equal', () => {
    const result = diffArrays([1, 2], [1, 2]);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('handles all items removed', () => {
    const result = diffArrays([1, 2], []);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([1, 2]);
  });

  it('handles all items added', () => {
    const result = diffArrays([], [1, 2]);

    expect(result.added).toEqual([1, 2]);
    expect(result.removed).toEqual([]);
  });

  it('uses a custom comparator for objects', () => {
    const prev = [{ id: 1 }, { id: 2 }];
    const next = [{ id: 2 }, { id: 3 }];
    const result = diffArrays(prev, next, (a, b) => a.id === b.id);

    expect(result.added).toEqual([{ id: 3 }]);
    expect(result.removed).toEqual([{ id: 1 }]);
  });

  it('handles empty both sides', () => {
    const result = diffArrays([], []);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});
