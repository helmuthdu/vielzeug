import { sortBy } from '../sortBy';

describe('sortBy', () => {
  it('sorts by a single key ascending', () => {
    const data = [{ a: 2 }, { a: 1 }, { a: 3 }];
    expect(sortBy(data, { a: 'asc' })).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it('sorts by a single key descending', () => {
    const data = [{ a: 2 }, { a: 1 }, { a: 3 }];
    expect(sortBy(data, { a: 'desc' })).toEqual([{ a: 3 }, { a: 2 }, { a: 1 }]);
  });

  it('sorts by multiple keys', () => {
    const data = [
      { age: 30, name: 'Alice' },
      { age: 25, name: 'Bob' },
      { age: 35, name: 'Charlie' },
      { age: 25, name: 'Alice' },
      { age: 30, name: 'Bob' },
      { age: 30, name: 'Charlie' },
    ];
    // biome-ignore assist/source/useSortedKeys: the order matters
    expect(sortBy(data, { name: 'asc', age: 'desc' })).toEqual([
      { age: 30, name: 'Alice' },
      { age: 25, name: 'Alice' },
      { age: 30, name: 'Bob' },
      { age: 25, name: 'Bob' },
      { age: 35, name: 'Charlie' },
      { age: 30, name: 'Charlie' },
    ]);
  });

  it('returns a new array and does not mutate the original', () => {
    const data = [{ a: 2 }, { a: 1 }];
    const sorted = sortBy(data, { a: 'asc' });
    expect(sorted).not.toBe(data);
    expect(data).toEqual([{ a: 2 }, { a: 1 }]);
  });

  it('handles empty array', () => {
    expect(sortBy([], { a: 'asc' })).toEqual([]);
  });

  it('handles empty selectors (returns original order)', () => {
    const data = [{ a: 2 }, { a: 1 }];
    expect(sortBy(data, {})).toEqual([{ a: 2 }, { a: 1 }]);
  });

  it('handles missing keys gracefully', () => {
    const data = [{ a: 2 }, { b: 1 }, { a: 3 }];
    expect(sortBy(data, { a: 'desc' })).toEqual([{ b: 1 }, { a: 3 }, { a: 2 }]);
    expect(sortBy(data, { a: 'asc' })).toEqual([{ a: 2 }, { a: 3 }, { b: 1 }]);
  });

  it('sorts by string and number keys', () => {
    const data = [
      { age: 30, name: 'Bob' },
      { age: 25, name: 'Alice' },
      { age: 25, name: 'Bob' },
    ];
    expect(sortBy(data, { age: 'asc', name: 'asc' })).toEqual([
      { age: 25, name: 'Alice' },
      { age: 25, name: 'Bob' },
      { age: 30, name: 'Bob' },
    ]);
  });
});
