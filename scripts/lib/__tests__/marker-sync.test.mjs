import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { replaceBetweenMarkers, syncFile } from '../marker-sync.mjs';

describe('replaceBetweenMarkers()', () => {
  it('replaces content between markers, keeping the markers themselves, with a blank line on both sides', () => {
    const result = replaceBetweenMarkers('before\nBEGIN\nold\nEND\nafter', 'BEGIN', 'END', 'new');
    expect(result).toBe('before\nBEGIN\n\nnew\n\nEND\nafter');
  });

  it('throws when markers are missing', () => {
    expect(() => replaceBetweenMarkers('no markers here', 'BEGIN', 'END', 'x')).toThrow(/not found/);
  });
});

describe('syncFile()', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it('writes new content and reports "written"', () => {
    root = mkdtempSync(path.join(tmpdir(), 'marker-sync-test-'));
    expect(syncFile('out.txt', 'hello', { root })).toBe('written');
    expect(readFileSync(path.join(root, 'out.txt'), 'utf8')).toBe('hello');
  });

  it('is a no-op when content is unchanged', () => {
    root = mkdtempSync(path.join(tmpdir(), 'marker-sync-test-'));
    syncFile('out.txt', 'hello', { root });
    expect(syncFile('out.txt', 'hello', { root })).toBe('unchanged');
  });

  it('creates missing parent directories', () => {
    root = mkdtempSync(path.join(tmpdir(), 'marker-sync-test-'));
    syncFile('nested/dir/out.txt', 'hi', { root });
    expect(readFileSync(path.join(root, 'nested/dir/out.txt'), 'utf8')).toBe('hi');
  });

  it('in check mode never writes and reports stale', () => {
    root = mkdtempSync(path.join(tmpdir(), 'marker-sync-test-'));
    const stales = [];
    expect(syncFile('out.txt', 'content', { check: true, onStale: (m) => stales.push(m), root })).toBe('stale');
    expect(stales).toEqual(['[STALE] out.txt is out of sync']);
    expect(() => readFileSync(path.join(root, 'out.txt'))).toThrow();
  });
});
