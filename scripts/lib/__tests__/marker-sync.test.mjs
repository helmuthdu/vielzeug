import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { isTracked, replaceBetweenMarkers, syncFile, syncPatchedFile } from '../marker-sync.mjs';

describe('replaceBetweenMarkers()', () => {
  it('replaces content between markers, keeping the markers themselves, with a blank line on both sides', () => {
    const result = replaceBetweenMarkers('before\nBEGIN\nold\nEND\nafter', 'BEGIN', 'END', 'new');
    expect(result).toBe('before\nBEGIN\n\nnew\n\nEND\nafter');
  });

  it('throws when markers are missing', () => {
    expect(() => replaceBetweenMarkers('no markers here', 'BEGIN', 'END', 'x')).toThrow(/not found/);
  });
});

function makeTempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'marker-sync-test-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

describe('isTracked() — real git repo, including hostile hook-like environments', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it('reports tracked vs gitignored correctly', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, '.gitignore'), 'ignored.txt\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });

    expect(isTracked('tracked.txt', root)).toBe(true);
    expect(isTracked('ignored.txt', root)).toBe(false);
  });

  it('is unaffected by an inherited GIT_DIR pointing elsewhere', () => {
    root = makeTempRepo();
    const originalGitDir = process.env.GIT_DIR;
    process.env.GIT_DIR = '/tmp/marker-sync-test-bogus-gitdir';
    try {
      expect(isTracked('tracked.txt', root)).toBe(true);
    } finally {
      if (originalGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = originalGitDir;
    }
  });
});

describe('syncFile() / syncPatchedFile() — filesystem behavior in an isolated repo', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it('syncFile writes new content and reports "written"', () => {
    root = makeTempRepo();
    expect(syncFile('out.txt', 'hello', { root })).toBe('written');
    expect(execFileSync('cat', [path.join(root, 'out.txt')], { encoding: 'utf8' })).toBe('hello');
  });

  it('syncFile is a no-op when content is unchanged', () => {
    root = makeTempRepo();
    syncFile('out.txt', 'hello', { root });
    expect(syncFile('out.txt', 'hello', { root })).toBe('unchanged');
  });

  it('syncFile creates missing parent directories', () => {
    root = makeTempRepo();
    syncFile('nested/dir/out.txt', 'hi', { root });
    expect(execFileSync('cat', [path.join(root, 'nested/dir/out.txt')], { encoding: 'utf8' })).toBe('hi');
  });

  it('syncFile in check mode never writes, and reports stale only for tracked files', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, '.gitignore'), 'ignored.txt\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });

    const stales = [];
    const trackedResult = syncFile('tracked.txt', 'content', { check: true, onStale: (m) => stales.push(m), root });
    const ignoredResult = syncFile('ignored.txt', 'content', { check: true, onStale: (m) => stales.push(m), root });

    expect(trackedResult).toBe('stale');
    expect(ignoredResult).toBe('skipped');
    expect(stales).toHaveLength(1);
    expect(stales[0]).toMatch(/tracked\.txt/);
  });

  it('syncPatchedFile patches an existing file between markers', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, 'target.md'), 'a\nBEGIN\nold\nEND\nb\n');
    const result = syncPatchedFile('target.md', 'BEGIN', 'END', 'new', { root });
    expect(result).toBe('written');
    expect(execFileSync('cat', [path.join(root, 'target.md')], { encoding: 'utf8' })).toBe(
      'a\nBEGIN\n\nnew\n\nEND\nb\n',
    );
  });

  it('syncPatchedFile skips (does not throw) when the target file is missing', () => {
    root = makeTempRepo();
    expect(syncPatchedFile('missing.md', 'BEGIN', 'END', 'new', { root })).toBe('skipped');
  });

  it('syncPatchedFile in check mode reports stale (not a crash) on corrupted markers', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, 'target.md'), 'no markers here\n');
    execFileSync('git', ['add', 'target.md'], { cwd: root });
    const stales = [];
    const result = syncPatchedFile('target.md', 'BEGIN', 'END', 'new', {
      check: true,
      onStale: (m) => stales.push(m),
      root,
    });
    expect(result).toBe('stale');
    expect(stales).toHaveLength(1);
  });

  it('syncPatchedFile in write mode throws a clear error on corrupted markers', () => {
    root = makeTempRepo();
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, 'target.md'), 'no markers here\n');
    expect(() => syncPatchedFile('target.md', 'BEGIN', 'END', 'new', { root })).toThrow(/fix or restore the markers/);
  });
});
