import { diff } from '../diff';

describe('diff', () => {
  it('returns empty result when both inputs are omitted', () => {
    expect(diff()).toEqual({ added: [], changed: {}, removed: [] });
  });

  it('returns empty result when both objects are equal', () => {
    const obj = { a: 1, b: 2 };

    expect(diff(obj, obj)).toEqual({ added: [], changed: {}, removed: [] });
  });

  it('reports added keys', () => {
    const result = diff({ a: 1 }, { a: 1, b: 2 });

    expect(result.added).toEqual(['b']);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual({});
  });

  it('reports removed keys', () => {
    const result = diff({ a: 1, b: 2 }, { a: 1 });

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['b']);
    expect(result.changed).toEqual({});
  });

  it('reports changed values', () => {
    const result = diff({ a: 1, b: 2 }, { a: 1, b: 99 });

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual({ b: { after: 99, before: 2 } });
  });

  it('handles combined add/remove/change in one call', () => {
    const result = diff({ a: 1, b: 2, c: 3 }, { b: 2, c: 99, d: 4 });

    expect(result.removed).toEqual(['a']);
    expect(result.added).toEqual(['d']);
    expect(result.changed).toEqual({ c: { after: 99, before: 3 } });
  });

  it('treats object values as atomic (no deep nesting)', () => {
    const result = diff({ x: { n: 1 } }, { x: { n: 2 } });

    expect(result.changed).toEqual({ x: { after: { n: 2 }, before: { n: 1 } } });
  });

  it('uses a custom comparator when provided', () => {
    const result = diff({ a: 1, b: 2 }, { a: 1, b: '2' }, (x, y) => x == y);

    expect(result.changed).toEqual({});
  });

  it('guards against __proto__ prototype pollution via changed — security regression', () => {
    const before = JSON.parse('{"__proto__":{"n":1}}') as Record<string, unknown>;
    const after = JSON.parse('{"__proto__":{"n":2}}') as Record<string, unknown>;
    const result = diff(before, after);

    expect(Object.hasOwn(result.changed, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(result.changed)).toBe(Object.prototype);
  });
});
