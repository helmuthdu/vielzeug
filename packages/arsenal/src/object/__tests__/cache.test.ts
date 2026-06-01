import { cache } from '../cache';

describe('cache', () => {
  it('returns undefined for a missing key', () => {
    const c = cache<string, number>(3);

    expect(c.get('a')).toBeUndefined();
  });

  it('stores and retrieves values', () => {
    const c = cache<string, number>(3);

    c.set('a', 1);
    expect(c.get('a')).toBe(1);
  });

  it('overwrites existing keys', () => {
    const c = cache<string, number>(3);

    c.set('a', 1);
    c.set('a', 99);
    expect(c.get('a')).toBe(99);
  });

  it('evicts the oldest entry when at capacity', () => {
    const c = cache<string, number>(2);

    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3); // 'a' should be evicted

    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });

  it('handles maxSize of 1', () => {
    const c = cache<string, number>(1);

    c.set('a', 1);
    c.set('b', 2);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
  });

  it('supports non-string keys', () => {
    const c = cache<number, string>(3);

    c.set(1, 'one');
    c.set(2, 'two');
    expect(c.get(1)).toBe('one');
    expect(c.get(2)).toBe('two');
  });
});
