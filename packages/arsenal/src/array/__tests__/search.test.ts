import { ArsenalValidationError } from '../../errors';
import { fuzzy, fuzzyFilter, fuzzyScore } from '../search';

describe('fuzzyFilter', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
  ];

  it('should return both objects for a matching search string', () => {
    const result = fuzzyFilter(data, 'doe', { threshold: 0.25 });

    expect(result).toEqual(data);
  });

  it('should return all items for an empty search string', () => {
    const emptyResult = fuzzyFilter(data, '', { threshold: 0.25 });

    expect(emptyResult).toEqual(data);
  });

  it('should return one object for a partial match', () => {
    const partialMatch = fuzzyFilter(data, 'jon', { threshold: 0.375 });

    expect(partialMatch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should return an empty array for no match', () => {
    const noMatch = fuzzyFilter(data, 'xyz', { threshold: 0.25 });

    expect(noMatch).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const caseInsensitive = fuzzyFilter(data, 'JOHN', { threshold: 0.25 });

    expect(caseInsensitive).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should be able to search for numbers', () => {
    const numberSearch = fuzzyFilter(data, '25', { threshold: 0.25 });

    expect(numberSearch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('restricts search to specified fields', () => {
    const result = fuzzyFilter(data, '25', { fields: ['name'] });

    expect(result).toEqual([]);
  });

  it('does not stack overflow on deeply nested objects beyond MAX_SEEK_DEPTH', () => {
    let nested: Record<string, unknown> = { value: 'target' };

    for (let i = 0; i < 20; i++) nested = { child: nested };

    expect(() => fuzzyFilter([nested], 'target')).not.toThrow();
  });

  describe('normalize option', () => {
    it('normalize:true matches accented chars against base form', () => {
      const data = ['café', 'resume', 'naïve'];
      const result = fuzzyFilter(data, 'cafe', { normalize: true, threshold: 0.8 });

      expect(result).toContain('café');
    });

    it('normalize:false (default) does not match accented to base form', () => {
      const data = ['café'];
      const result = fuzzyFilter(data, 'cafe', { normalize: false, threshold: 1 });

      expect(result).toHaveLength(0);
    });
  });
});

describe('fuzzyScore', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
    { age: 22, name: 'Alice Smith' },
  ];

  it('returns ScoredResult array', () => {
    const results = fuzzyScore(data, 'doe');

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('item');
    expect(results[0]).toHaveProperty('score');
    expect(typeof results[0]!.score).toBe('number');
  });

  it('returns results sorted by score descending', () => {
    const results = fuzzyScore(data, 'john');

    expect(results.length).toBeGreaterThanOrEqual(1);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('returns all items with score 1 when query is empty', () => {
    const results = fuzzyScore(data, '');

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.score === 1)).toBe(true);
  });

  it('filters by threshold', () => {
    const results = fuzzyScore(data, 'alice', { threshold: 0.9 });

    expect(results.every((r) => r.score >= 0.9)).toBe(true);
  });

  it('restricts to specified fields', () => {
    const results = fuzzyScore(data, '25', { fields: ['name'] });

    expect(results).toEqual([]);
  });

  it('handles large arrays without stack overflow', () => {
    const large = Array.from({ length: 200_000 }, (_, i) => ({ id: i, name: `item-${i}` }));

    expect(() => fuzzyScore(large, 'item-42')).not.toThrow();
  });

  it('handles items with large array fields without stack overflow', () => {
    const record = { tags: Array.from({ length: 200_000 }, (_, i) => `tag-${i}`) };

    expect(() => fuzzyScore([record], 'tag-42')).not.toThrow();
  });

  it('does not stack overflow on deeply nested objects beyond MAX_SEEK_DEPTH', () => {
    let nested: Record<string, unknown> = { value: 'target' };

    for (let i = 0; i < 20; i++) nested = { child: nested };

    expect(() => fuzzyScore([nested], 'target')).not.toThrow();
  });

  describe('normalize option', () => {
    it('normalize:true matches accented chars against base form', () => {
      const data = [{ name: 'José' }, { name: 'John' }];
      const result = fuzzyScore(data, 'jose', { fields: ['name'], normalize: true, threshold: 0.5 });

      expect(result[0]?.item.name).toBe('José');
    });
  });
});

describe('fuzzy', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
  ];

  it('defaults to filter mode (T[]), matching fuzzyFilter', () => {
    expect(fuzzy(data, 'doe')).toEqual(fuzzyFilter(data, 'doe'));
  });

  it('{ scored: true } dispatches to fuzzyScore (ScoredResult<T>[])', () => {
    const result = fuzzy(data, 'doe', { scored: true });

    expect(result).toEqual(fuzzyScore(data, 'doe'));
    expect(result[0]).toHaveProperty('item');
    expect(result[0]).toHaveProperty('score');
  });

  it('{ scored: false } explicitly still dispatches to filter mode', () => {
    expect(fuzzy(data, 'doe', { scored: false })).toEqual(fuzzyFilter(data, 'doe'));
  });

  it('forwards fields/threshold/normalize options through to the scored dispatch', () => {
    const result = fuzzy(data, '25', { fields: ['name'], scored: true });

    expect(result).toEqual([]);
  });

  describe('maxDepth option', () => {
    it('a shallower maxDepth stops matching values nested past that depth', () => {
      const nested = { a: { b: { c: 'target' } } };

      expect(fuzzyFilter([nested], 'target', { threshold: 1 })).toEqual([nested]);
      expect(fuzzyFilter([nested], 'target', { maxDepth: 1, threshold: 1 })).toEqual([]);
    });

    it('defaults to a depth of 10, matching the previous hardcoded behavior', () => {
      let nested: Record<string, unknown> = { value: 'target' };

      for (let i = 0; i < 9; i++) nested = { child: nested }; // 10 levels total

      expect(fuzzyFilter([nested], 'target', { threshold: 1 })).toEqual([nested]);
    });

    it('throws ArsenalValidationError for a negative or non-integer maxDepth — untrusted-input hardening', () => {
      expect(() => fuzzyFilter([{ a: 1 }], 'x', { maxDepth: -1 })).toThrow(ArsenalValidationError);
      expect(() => fuzzyFilter([{ a: 1 }], 'x', { maxDepth: 1.5 })).toThrow(ArsenalValidationError);
      expect(() => fuzzyScore([{ a: 1 }], 'x', { maxDepth: Number.NaN })).toThrow(ArsenalValidationError);
    });

    it('clamps an excessively large maxDepth instead of allowing unbounded recursion — untrusted-input hardening', () => {
      // A very deep (but non-circular) structure — with an unclamped maxDepth this could exhaust
      // the call stack; clamping to a hard ceiling keeps recursion bounded regardless of input.
      let nested: Record<string, unknown> = { value: 'target' };

      for (let i = 0; i < 50; i++) nested = { child: nested };

      expect(() => fuzzyFilter([nested], 'target', { maxDepth: Number.MAX_SAFE_INTEGER, threshold: 1 })).not.toThrow();
    });
  });
});
