import { flattenPaths, isSafePath, unflattenPaths } from '../flattenPaths';

describe('isSafePath', () => {
  it('returns true for safe paths', () => {
    expect(isSafePath('user.name')).toBe(true);
    expect(isSafePath('a.b.c')).toBe(true);
    expect(isSafePath('key')).toBe(true);
  });

  it('returns false for prototype-polluting segments', () => {
    expect(isSafePath('__proto__.polluted')).toBe(false);
    expect(isSafePath('constructor.prototype')).toBe(false);
    expect(isSafePath('prototype.x')).toBe(false);
    expect(isSafePath('a.__proto__')).toBe(false);
  });
});

describe('flattenPaths', () => {
  it('flattens a nested object to dot-notation paths', () => {
    expect(flattenPaths({ a: { b: 1 } })).toEqual({ 'a.b': 1 });
  });

  it('handles deeply nested objects', () => {
    expect(flattenPaths({ a: { b: { c: 'deep' } } })).toEqual({ 'a.b.c': 'deep' });
  });

  it('leaves leaf-level primitives as-is', () => {
    expect(flattenPaths({ x: 1, y: 'two', z: true })).toEqual({ x: 1, y: 'two', z: true });
  });

  it('flattens an empty object to an empty object', () => {
    expect(flattenPaths({})).toEqual({});
  });

  it('handles arrays as leaf values', () => {
    const result = flattenPaths({ tags: [1, 2, 3] });

    expect(result).toEqual({ tags: [1, 2, 3] });
  });

  it('flattens objects nested exactly 10 levels deep', () => {
    let deepObj: Record<string, unknown> = { leaf: 'value' };

    for (let i = 0; i < 9; i++) deepObj = { nested: deepObj };

    const result = flattenPaths(deepObj);

    expect(Object.values(result).some((v) => v === 'value')).toBe(true);
  });

  it('does not throw for objects nested more than 10 levels deep — treats the deep node as a leaf', () => {
    let deepObj: Record<string, unknown> = { leaf: 'value' };

    for (let i = 0; i < 11; i++) deepObj = { nested: deepObj };

    expect(() => flattenPaths(deepObj)).not.toThrow();

    const result = flattenPaths(deepObj);

    // The path at depth 10 is stored as an opaque object leaf — not recursed into further.
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
});

describe('unflattenPaths', () => {
  it('reconstructs a nested object from dot-notation paths', () => {
    expect(unflattenPaths({ 'a.b': 1 })).toEqual({ a: { b: 1 } });
  });

  it('handles multiple nested paths', () => {
    expect(unflattenPaths({ 'a.x': 1, 'a.y': 2, 'b.z': 3 })).toEqual({ a: { x: 1, y: 2 }, b: { z: 3 } });
  });

  it('skips prototype-polluting keys', () => {
    const result = unflattenPaths({ '__proto__.bad': 'evil' });

    expect((Object.prototype as Record<string, unknown>)['bad']).toBeUndefined();
    expect(result).toEqual({});
  });

  it('handles an empty object', () => {
    expect(unflattenPaths({})).toEqual({});
  });

  it('is a round-trip with flattenPaths for plain objects', () => {
    const input = { a: { b: 1, c: 2 }, d: { e: { f: 3 } } };

    expect(unflattenPaths(flattenPaths(input))).toEqual(input);
  });
});
