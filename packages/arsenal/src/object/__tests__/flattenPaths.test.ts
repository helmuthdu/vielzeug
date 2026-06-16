import { describe, expect, it } from 'vitest';

import { flattenPaths, unflattenPaths } from '../flattenPaths';

describe('flattenPaths', () => {
  it('flattens a simple nested object', () => {
    expect(flattenPaths({ a: { b: 1, c: 2 }, d: 3 })).toEqual({ 'a.b': 1, 'a.c': 2, d: 3 });
  });

  it('returns flat object unchanged', () => {
    expect(flattenPaths({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('handles empty input', () => {
    expect(flattenPaths({})).toEqual({});
  });

  it('handles deeply nested objects', () => {
    expect(flattenPaths({ a: { b: { c: { d: 1 } } } })).toEqual({ 'a.b.c.d': 1 });
  });

  it('treats arrays as opaque leaf values', () => {
    const result = flattenPaths({ a: [1, 2, 3] });

    expect(result).toEqual({ a: [1, 2, 3] });
  });

  it('silently skips unsafe path segment __proto__', () => {
    const result = flattenPaths({ __proto__: { x: 1 }, safe: 2 });

    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('__proto__.x');
    expect(result).toEqual({ safe: 2 });
  });

  it('silently skips unsafe path segment constructor', () => {
    const result = flattenPaths({ constructor: { name: 'evil' }, safe: 1 });

    expect(result).not.toHaveProperty('constructor');
    expect(result).toEqual({ safe: 1 });
  });

  it('silently skips unsafe path segment prototype', () => {
    const result = flattenPaths({ prototype: { x: 1 }, safe: 1 });

    expect(result).not.toHaveProperty('prototype');
    expect(result).toEqual({ safe: 1 });
  });

  it('treats object at max depth as opaque leaf', () => {
    const deep: Record<string, unknown> = {};
    let cur = deep;

    for (let i = 0; i < 12; i++) {
      const next: Record<string, unknown> = {};

      cur[`l${i}`] = next;
      cur = next;
    }
    cur['leaf'] = 'value';

    const result = flattenPaths(deep);
    const keys = Object.keys(result);

    expect(keys.every((k) => !k.includes('leaf'))).toBe(true);
  });

  it('handles null and undefined leaf values', () => {
    expect(flattenPaths({ a: { b: null, c: undefined } })).toEqual({ 'a.b': null, 'a.c': undefined });
  });

  it('handles mixed flat and nested keys', () => {
    expect(flattenPaths({ a: 1, b: { c: 2, d: { e: 3 } }, f: 4 })).toEqual({
      a: 1,
      'b.c': 2,
      'b.d.e': 3,
      f: 4,
    });
  });
});

describe('unflattenPaths', () => {
  it('reconstructs a nested object from flat dot-notation keys', () => {
    expect(unflattenPaths({ 'a.b': 1, 'a.c': 2, d: 3 })).toEqual({ a: { b: 1, c: 2 }, d: 3 });
  });

  it('handles empty input', () => {
    expect(unflattenPaths({})).toEqual({});
  });

  it('handles single-level flat keys', () => {
    expect(unflattenPaths({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('handles deeply nested keys', () => {
    expect(unflattenPaths({ 'a.b.c.d': 1 })).toEqual({ a: { b: { c: { d: 1 } } } });
  });

  it('silently skips keys containing unsafe segments', () => {
    expect(unflattenPaths({ '__proto__.x': 1, safe: 2 })).toEqual({ safe: 2 });
    expect(unflattenPaths({ 'a.constructor.b': 1, ok: 2 })).toEqual({ ok: 2 });
  });

  it('is a roundtrip inverse of flattenPaths for plain objects', () => {
    const original = { a: { b: 1, c: 2 }, d: 3 };

    expect(unflattenPaths(flattenPaths(original))).toEqual(original);
  });

  it('later keys overwrite earlier for conflicting paths', () => {
    const result = unflattenPaths({ 'a.b': 1, 'a.b': 2 });

    expect(result).toEqual({ a: { b: 2 } });
  });
});
