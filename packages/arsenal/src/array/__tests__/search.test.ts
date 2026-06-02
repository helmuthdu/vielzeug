import { search } from '../search';

describe('fuzzy', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
  ];

  it('should return both objects for a matching search string', () => {
    const result = search(data, 'doe', { threshold: 0.25 });

    expect(result).toEqual(data);
  });

  it('should return all items for an empty search string', () => {
    const emptyResult = search(data, '', { threshold: 0.25 });

    expect(emptyResult).toEqual(data);
  });

  it('should return one object for a partial match', () => {
    const partialMatch = search(data, 'jon', { threshold: 0.375 });

    expect(partialMatch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should return an empty array for no match', () => {
    const noMatch = search(data, 'xyz', { threshold: 0.25 });

    expect(noMatch).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const caseInsensitive = search(data, 'JOHN', { threshold: 0.25 });

    expect(caseInsensitive).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should be able to search for numbers', () => {
    const numberSearch = search(data, '25', { threshold: 0.25 });

    expect(numberSearch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('restricts search to specified fields', () => {
    const result = search(data, '25', { fields: ['name'] });

    expect(result).toEqual([]);
  });
});

describe('search scored mode', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
    { age: 22, name: 'Alice Smith' },
  ];

  it('returns ScoredResult array when mode is scored', () => {
    const results = search(data, 'doe', { mode: 'scored' });

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('item');
    expect(results[0]).toHaveProperty('score');
    expect(typeof results[0]!.score).toBe('number');
  });

  it('returns results sorted by score descending', () => {
    const results = search(data, 'john', { mode: 'scored' });

    expect(results.length).toBeGreaterThanOrEqual(1);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('returns all items with score 1 when query is empty', () => {
    const results = search(data, '', { mode: 'scored' });

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.score === 1)).toBe(true);
  });

  it('filters by threshold in scored mode', () => {
    const results = search(data, 'alice', { mode: 'scored', threshold: 0.9 });

    expect(results.every((r) => r.score >= 0.9)).toBe(true);
  });

  it('restricts to fields in scored mode', () => {
    const results = search(data, '25', { fields: ['name'], mode: 'scored' });

    expect(results).toEqual([]);
  });

  it('handles large arrays without stack overflow', () => {
    const large = Array.from({ length: 200_000 }, (_, i) => ({ id: i, name: `item-${i}` }));

    expect(() => search(large, 'item-42', { mode: 'scored' })).not.toThrow();
  });

  it('handles items with large array fields without stack overflow', () => {
    const record = { tags: Array.from({ length: 200_000 }, (_, i) => `tag-${i}`) };

    expect(() => search([record], 'tag-42', { mode: 'scored' })).not.toThrow();
  });
});
