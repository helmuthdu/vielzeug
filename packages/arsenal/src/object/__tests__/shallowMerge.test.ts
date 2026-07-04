import { shallowMerge } from '../merge';

describe('shallowMerge', () => {
  it('merges two flat objects', () => {
    expect(shallowMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('later sources override earlier ones', () => {
    expect(shallowMerge({ a: 1 }, { a: 99 })).toEqual({ a: 99 });
  });

  it('does not deep-merge nested objects', () => {
    const result = shallowMerge({ a: { x: 1, y: 2 } }, { a: { x: 99 } });

    expect(result).toEqual({ a: { x: 99 } });
  });

  it('handles multiple sources', () => {
    expect(shallowMerge({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('returns an empty object when given no arguments', () => {
    expect(shallowMerge()).toEqual({});
  });

  it('does not mutate the first argument', () => {
    const target = { a: 1 };

    shallowMerge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
  });

  it('guards against __proto__ prototype pollution — security regression', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
    const result = shallowMerge({}, malicious);

    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});
