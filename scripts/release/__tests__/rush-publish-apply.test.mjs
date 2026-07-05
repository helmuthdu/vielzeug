import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyVersionBump, listChangedPackageNames, listChangeFiles } from '../rush-publish-apply.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function makeRepo() {
  root = mkdtempSync(path.join(tmpdir(), 'rush-publish-apply-test-'));
  mkdirSync(path.join(root, 'common', 'changes', '@vielzeug/ore'), { recursive: true });
  mkdirSync(path.join(root, 'common', 'changes', '@vielzeug/orbit'), { recursive: true });
  writeFileSync(path.join(root, 'common', 'changes', '@vielzeug/ore', 'a.json'), '{}');
  writeFileSync(path.join(root, 'common', 'changes', '@vielzeug/orbit', 'b.json'), '{}');
  return root;
}

describe('listChangeFiles()', () => {
  it('returns an empty array when the changes directory does not exist', () => {
    expect(listChangeFiles(path.join(tmpdir(), 'does-not-exist'))).toEqual([]);
  });

  it('lists every *.json change file, one per package directory', () => {
    const repo = makeRepo();
    const files = listChangeFiles(path.join(repo, 'common', 'changes')).sort();
    expect(files).toEqual([path.join('@vielzeug/orbit', 'b.json'), path.join('@vielzeug/ore', 'a.json')]);
  });
});

describe('listChangedPackageNames()', () => {
  it('returns sorted, de-duplicated package names', () => {
    const repo = makeRepo();
    writeFileSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'c.json'), '{}');
    expect(listChangedPackageNames(repo)).toEqual(['@vielzeug/orbit', '@vielzeug/ore']);
  });

  it('returns an empty array when nothing is pending', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rush-publish-apply-test-'));
    expect(listChangedPackageNames(root)).toEqual([]);
  });
});

describe('applyVersionBump()', () => {
  it('applies every pending change file when no package is given (bulk release)', () => {
    const repo = makeRepo();
    const run = vi.fn();

    applyVersionBump(undefined, { root: repo, run });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][1]).toContain('publish');
    // Nothing was moved aside — both files are untouched.
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'a.json'))).toBe(true);
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'b.json'))).toBe(true);
  });

  it('isolates the target package: other packages change files are absent during the rush call, then restored', () => {
    const repo = makeRepo();
    let orbitFileExistedDuringApply;

    const run = vi.fn((cmd) => {
      if (cmd === 'node') {
        orbitFileExistedDuringApply = existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'b.json'));
      }
      if (cmd === 'git') return ''; // no pending git changes — skip the restore-commit branch
    });

    applyVersionBump('@vielzeug/ore', { root: repo, run });

    expect(orbitFileExistedDuringApply).toBe(false);
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'a.json'))).toBe(true);
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'b.json'))).toBe(true);
    expect(readFileSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'b.json'), 'utf8')).toBe('{}');
  });

  it('re-commits restored change files when git still sees them as changed', () => {
    const repo = makeRepo();
    const run = vi.fn((cmd) => {
      if (cmd === 'git') return ' D common/changes/@vielzeug/orbit/b.json\n';
    });

    applyVersionBump('@vielzeug/ore', { root: repo, run });

    const gitCalls = run.mock.calls.filter(([cmd]) => cmd === 'git');
    expect(gitCalls.map(([, args]) => args[0])).toEqual(['status', 'add', 'commit']);
  });

  it('restores the other packages change files even when the rush call throws', () => {
    const repo = makeRepo();
    const run = vi.fn((cmd) => {
      if (cmd === 'node') throw new Error('rush publish failed');
      if (cmd === 'git') return '';
    });

    expect(() => applyVersionBump('@vielzeug/ore', { root: repo, run })).toThrow('rush publish failed');
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'b.json'))).toBe(true);
  });
});
