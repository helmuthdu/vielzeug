import { describe, expect, it } from 'vitest';
import { merge } from '../merge';
import { apply, diff } from '../patch';
import type { JsonObject, JsonValue } from '../types';

const clean = (base: JsonValue, local: JsonValue, remote: JsonValue): JsonValue => {
  const result = merge(base, local, remote);
  expect(result.conflicts).toEqual([]);
  return result.doc;
};

describe('merge', () => {
  it('returns either side untouched when one side did not change', () => {
    const base: JsonValue = { a: 1, nested: { b: 2 } };
    const edited: JsonValue = { a: 9, nested: { b: 2 } };
    expect(merge(base, base, edited).doc).toBe(edited);
    expect(merge(base, edited, base).doc).toBe(edited);
  });

  it('keeps independent field edits from both sides', () => {
    const doc = clean({ price: 10, title: 'Doc' }, { price: 10, title: 'New' }, { price: 12, title: 'Doc' });
    expect(doc).toEqual({ price: 12, title: 'New' });
  });

  it('conflicts only where both sides changed differently and resolves remote by default', () => {
    const result = merge({ keep: 'same', rev: 1 }, { keep: 'same', rev: 2 }, { keep: 'same', rev: 3 });
    expect(result.doc).toEqual({ keep: 'same', rev: 3 });
    expect(result.conflicts).toEqual([{ base: 1, local: 2, path: '/rev', remote: 3 }]);
    expect(merge({ rev: 1 }, { rev: 2 }, { rev: 3 }, { resolution: 'local' }).doc).toEqual({ rev: 2 });
  });

  it('merges nested objects field-by-field', () => {
    const doc = clean(
      { meta: { a: 1, b: 1, inner: { c: 1 } } },
      { meta: { a: 2, b: 1, inner: { c: 1 } } },
      { meta: { a: 1, b: 2, inner: { c: 2 } } },
    );
    expect(doc).toEqual({ meta: { a: 2, b: 2, inner: { c: 2 } } });
  });

  it('keeps additions from either side and merges equal additions', () => {
    expect(clean({ a: 1 }, { a: 1, fromLocal: 'L' }, { a: 1, fromRemote: 'R' })).toEqual({
      a: 1,
      fromLocal: 'L',
      fromRemote: 'R',
    });
    expect(clean({}, { same: 1 }, { same: 1 })).toEqual({ same: 1 });
  });

  it('conflicts when both sides added the same key with different values', () => {
    const result = merge({}, { widget: 'local' }, { widget: 'remote' });
    expect(result.conflicts).toEqual([{ base: undefined, local: 'local', path: '/widget', remote: 'remote' }]);
    expect(result.doc).toEqual({ widget: 'remote' });
  });

  it('lets a delete stand when the other side did not edit', () => {
    expect(clean({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 })).toEqual({ a: 1 });
    expect(clean({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 })).toEqual({ a: 1 });
    expect(clean({ a: 1, b: 2 }, { a: 1 }, { a: 1 })).toEqual({ a: 1 });
  });

  it('conflicts delete against modify, honouring the resolution', () => {
    const base: JsonValue = { a: 1 };
    const local: JsonValue = { a: 2 };
    const remote: JsonValue = {};

    const remoteWins = merge(base, local, remote);
    expect(remoteWins.doc).toEqual({});
    expect(remoteWins.conflicts).toEqual([{ base: 1, local: 2, path: '/a', remote: undefined }]);

    const localWins = merge(base, local, remote, { resolution: 'local' });
    expect(localWins.doc).toEqual({ a: 2 });
    expect(localWins.conflicts).toEqual([{ base: 1, local: 2, path: '/a', remote: undefined }]);
  });

  it('concatenates pure appends (local first) and keeps the shorter pure truncation', () => {
    expect(clean(['a'], ['a', 'L'], ['a', 'R'])).toEqual(['a', 'L', 'R']);
    expect(clean(['a', 'x', 'y'], ['a'], ['a', 'x'])).toEqual(['a']);
    expect(clean({ tags: ['a'] }, { tags: ['a', 'L'] }, { tags: ['a', 'R'] })).toEqual({ tags: ['a', 'L', 'R'] });
  });

  it('conflicts whole arrays for mid edits and append-versus-truncate', () => {
    const midEdit = merge({ tags: ['a', 'b'] }, { tags: ['x', 'b'] }, { tags: ['a', 'b', 'c'] });
    expect(midEdit.conflicts.map((c) => c.path)).toEqual(['/tags']);
    const appendVsTruncate = merge([1, 2, 3], [1, 2, 3, 4], [1]);
    expect(appendVsTruncate.conflicts.map((c) => c.path)).toEqual(['']);
    expect(appendVsTruncate.doc).toEqual([1]); // remote wins by default
  });

  it('escapes special characters in conflict paths', () => {
    const result = merge({ 'a/b': 1 }, { 'a/b': 2 }, { 'a/b': 3 });
    expect(result.conflicts[0]?.path).toBe('/a~1b');
  });

  it('conflicts when the two sides change the base to different types', () => {
    const result = merge({ x: 1 }, { x: [1] }, { x: { y: 1 } });
    expect(result.conflicts.map((c) => c.path)).toEqual(['/x']);
    expect(result.doc).toEqual({ x: { y: 1 } });
  });

  it('composes with diff and apply: the merged doc is a patchable update of either input', () => {
    const base: JsonObject = { price: 10, title: 'Doc' };
    const local: JsonObject = { price: 10, title: 'Local' };
    const remote: JsonObject = { price: 12, title: 'Doc' };
    const result = merge(base, local, remote);
    expect(result.conflicts).toEqual([]);
    const patch = diff(local, result.doc);
    expect(patch).toEqual([{ op: 'replace', path: '/price', value: 12 }]);
    expect(apply(local, patch)).toEqual(result.doc);
  });
});
