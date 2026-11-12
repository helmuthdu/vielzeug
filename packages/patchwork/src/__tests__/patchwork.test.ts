import { describe, expect, it } from 'vitest';
import type { JsonValue } from '../index';
import { apply, diff, formatPointer, getIn, PatchPathError, PatchTestError, parsePointer, tryApply } from '../index';

const doc: JsonValue = {
  address: { city: 'Vienna', street: 'Ringstraße 1' },
  items: [
    { qty: 1, sku: 'a' },
    { qty: 2, sku: 'b' },
  ],
  tags: ['new'],
  title: 'Cart',
};

describe('pointers', () => {
  it('round-trips escaped tokens', () => {
    expect(parsePointer('/a~1b/c~0d')).toEqual(['a/b', 'c~d']);
    expect(formatPointer(['a/b', 'c~d'])).toBe('/a~1b/c~0d');
  });

  it('reads through objects and arrays', () => {
    expect(getIn(doc, '/address/city')).toBe('Vienna');
    expect(getIn(doc, '/items/1/sku')).toBe('b');
    expect(getIn(doc, '/items/5')).toBeUndefined();
    expect(getIn(doc, '')).toBe(doc);
  });
});

describe('apply', () => {
  it('adds replaces and removes with structural sharing', () => {
    const next = apply(doc, [
      { op: 'replace', path: '/title', value: 'Wagen' },
      { op: 'add', path: '/address/zip', value: '1010' },
      { op: 'remove', path: '/items/0' },
    ]);

    expect(next).toEqual({
      address: { city: 'Vienna', street: 'Ringstraße 1', zip: '1010' },
      items: [{ qty: 2, sku: 'b' }],
      tags: ['new'],
      title: 'Wagen',
    });
    // Untouched subtrees keep their identity; touched ones do not.
    expect((next as { tags: JsonValue }).tags).toBe((doc as { tags: JsonValue }).tags);
    expect((next as { address: JsonValue }).address).not.toBe((doc as { address: JsonValue }).address);
    expect(apply(doc, [])).toBe(doc);
  });

  it('appends with "-" and inserts at index', () => {
    const appended = apply(doc, [{ op: 'add', path: '/items/-', value: { qty: 9, sku: 'c' } }]);
    expect((appended as { items: unknown[] }).items).toHaveLength(3);
    const inserted = apply(doc, [{ op: 'add', path: '/items/0', value: { qty: 0, sku: 'z' } }]);
    expect((inserted as { items: { sku: string }[] }).items[0]?.sku).toBe('z');
  });

  it('moves copies and tests', () => {
    const moved = apply(doc, [{ from: '/tags/0', op: 'move', path: '/title' }]);
    expect((moved as { tags: string[] }).tags).toEqual([]);
    expect((moved as { title: string }).title).toBe('new');

    const copied = apply(doc, [{ from: '/address/city', op: 'copy', path: '/address/origin' }]);
    expect((copied as { address: { origin: string } }).address.origin).toBe('Vienna');

    expect(apply(doc, [{ op: 'test', path: '/address/city', value: 'Vienna' }])).toBe(doc);
  });

  it('clones added values so the patch source cannot mutate the doc', () => {
    const value = { nested: [1] };
    const next = apply(doc, [{ op: 'add', path: '/extra', value }]);
    value.nested.push(2);
    expect((next as { extra: { nested: number[] } }).extra.nested).toEqual([1]);
  });

  it('rejects missing paths and failed tests', () => {
    expect(() => apply(doc, [{ op: 'remove', path: '/nope' }])).toThrow(PatchPathError);
    expect(() => apply(doc, [{ op: 'replace', path: '/nope/deep', value: 1 }])).toThrow(PatchPathError);
    expect(() => apply(doc, [{ op: 'test', path: '/title', value: 'other' }])).toThrow(PatchTestError);
  });

  it('handles null as a value, not as absence', () => {
    const withNull: JsonValue = { a: null, items: [null, 1] };
    expect(apply(withNull, [{ op: 'test', path: '/a', value: null }])).toBe(withNull);
    expect(apply(withNull, [{ op: 'replace', path: '/items/0', value: 2 }])).toEqual({ a: null, items: [2, 1] });
  });
});

describe('tryApply', () => {
  it('returns the patched doc when every operation passes', () => {
    const result = tryApply(doc, [{ op: 'add', path: '/x', value: 1 }]);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.doc as { x: number }).x).toBe(1);
  });

  it('attributes move and copy failures to the right pointer', () => {
    const badTarget = tryApply(doc, [{ from: '/title', op: 'move', path: '/nope/deep' }]);
    expect(badTarget.ok).toBe(false);
    if (!badTarget.ok) expect(badTarget.error.path).toBe('/nope/deep');

    const badSource = tryApply(doc, [{ from: '/missing', op: 'copy', path: '/x' }]);
    expect(badSource.ok).toBe(false);
    if (!badSource.ok) expect(badSource.error.path).toBe('/missing');
  });

  it('exposes the offending pointer on the thrown error', () => {
    const thrown = (() => {
      try {
        apply(doc, [{ op: 'add', path: '/address/zip/deep', value: 1 }]);
        return undefined;
      } catch (error) {
        return error;
      }
    })();
    expect(thrown).toBeInstanceOf(PatchPathError);
    expect((thrown as PatchPathError).pointer).toBe('/address/zip/deep');
  });

  it('reports the failing operation without throwing', () => {
    const result = tryApply(doc, [
      { op: 'add', path: '/x', value: 1 },
      { op: 'test', path: '/x', value: 2 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.index).toBe(1);
      expect(result.error.reason).toBe('test');
      expect(result.error.path).toBe('/x');
    }
  });
});

describe('diff', () => {
  const roundTrip = (from: JsonValue, to: JsonValue) => {
    const patch = diff(from, to);
    expect(apply(from, patch)).toEqual(to);
    return patch;
  };

  it('emits nothing for equal documents', () => {
    expect(diff(doc, structuredClone(doc))).toEqual([]);
  });

  it('emits per-field operations for objects', () => {
    const patch = roundTrip({ a: 1, keep: true, old: 'x' }, { a: 2, added: 'y', keep: true });
    expect(patch).toContainEqual({ op: 'replace', path: '/a', value: 2 });
    expect(patch).toContainEqual({ op: 'remove', path: '/old' });
    expect(patch).toContainEqual({ op: 'add', path: '/added', value: 'y' });
  });

  it('keeps array patches small for appends', () => {
    const patch = roundTrip({ tags: ['a', 'b'] }, { tags: ['a', 'b', 'c'] });
    expect(patch).toEqual([{ op: 'add', path: '/tags/-', value: 'c' }]);
  });

  it('handles removals from the array tail', () => {
    const patch = roundTrip({ tags: ['a', 'b', 'c'] }, { tags: ['a'] });
    expect(patch).toEqual([
      { op: 'remove', path: '/tags/2' },
      { op: 'remove', path: '/tags/1' },
    ]);
  });

  it('inserts at the front and middle with a single operation', () => {
    expect(roundTrip([1, 2, 3, 4], [9, 1, 2, 3, 4])).toEqual([{ op: 'add', path: '/0', value: 9 }]);
    expect(roundTrip({ tags: ['a', 'c'] }, { tags: ['a', 'b', 'c'] })).toEqual([
      { op: 'add', path: '/tags/1', value: 'b' },
    ]);
    expect(roundTrip({ a: [1, 2, 3] }, { a: [1, 9, 2, 3] })).toEqual([{ op: 'add', path: '/a/1', value: 9 }]);
  });

  it('mixes positional replaces with ordered surplus removals and inserts', () => {
    roundTrip([1, 2, 3, 4, 5], [1, 9, 8, 7, 5]);
    roundTrip([1, 2, 3], [9, 0, 1, 2, 3]);
    roundTrip(['a', 'x', 'b'], ['a', 'b', 'new']);
    roundTrip([1, 2, 3, 4], [2, 3]);
  });

  it('round-trips seeded random documents', () => {
    let seed = 42;
    const rnd = (n: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const value = (depth: number): JsonValue => {
      const r = rnd(depth > 2 ? 5 : 8);
      if (r < 3) return rnd(10);
      if (r === 3) return (['x', 'y', 'z'] as const)[rnd(3)] as JsonValue;
      if (r === 4) return rnd(2) === 0;
      if (r === 5) return null;
      if (r === 6) return Array.from({ length: rnd(5) }, () => value(depth + 1));
      const out: Record<string, JsonValue> = {};
      for (const key of ['a', 'b', 'c', 'd'].slice(0, rnd(4))) out[key] = value(depth + 1);
      return out;
    };
    for (let n = 0; n < 500; n += 1) {
      const from = value(0);
      const to = value(0);
      expect(apply(from, diff(from, to))).toEqual(to);
    }
  });

  it('recurses into changed array entries', () => {
    const patch = roundTrip({ items: [{ qty: 1, sku: 'a' }] }, { items: [{ qty: 5, sku: 'a' }] });
    expect(patch).toEqual([{ op: 'replace', path: '/items/0/qty', value: 5 }]);
  });

  it('replaces whole documents at the root when types change', () => {
    const patch = roundTrip({ a: 1 }, [1, 2]);
    expect(patch).toEqual([{ op: 'replace', path: '', value: [1, 2] }]);
  });

  it('escapes special characters in keys', () => {
    const patch = roundTrip({ 'a/b': 1 }, { 'a/b': 2 });
    expect(patch).toEqual([{ op: 'replace', path: '/a~1b', value: 2 }]);
  });
});
