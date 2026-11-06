import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findProject, listProjectNames, listWorkspacePackages } from '../workspace.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function makeRepo() {
  root = mkdtempSync(path.join(tmpdir(), 'workspace-test-'));
  mkdirSync(path.join(root, 'packages', 'ore'), { recursive: true });
  writeFileSync(
    path.join(root, 'packages', 'ore', 'package.json'),
    JSON.stringify({ name: '@vielzeug/ore', version: '1.0.4' }),
  );
  return root;
}

describe('listProjectNames()', () => {
  it('lists every package name found under packages/', () => {
    const repo = makeRepo();
    expect(listProjectNames(repo)).toEqual(['@vielzeug/ore']);
  });
});

describe('listWorkspacePackages()', () => {
  it('reports every package with its folder, private flag, and version', () => {
    const repo = makeRepo();
    mkdirSync(path.join(root, 'packages', 'demo-thing'), { recursive: true });
    writeFileSync(
      path.join(root, 'packages', 'demo-thing', 'package.json'),
      JSON.stringify({ name: 'demo-thing', private: true, version: '0.0.0' }),
    );
    expect(listWorkspacePackages(repo)).toEqual([
      { folder: 'packages/ore', name: '@vielzeug/ore', private: false, version: '1.0.4' },
      { folder: 'packages/demo-thing', name: 'demo-thing', private: true, version: '0.0.0' },
    ]);
  });

  it('skips package directories without a package.json', () => {
    const repo = makeRepo();
    mkdirSync(path.join(root, 'packages', 'half-scaffolded'), { recursive: true });
    expect(listProjectNames(repo)).toEqual(['@vielzeug/ore']);
  });
});

describe('findProject()', () => {
  it('resolves the folder and current version', () => {
    const repo = makeRepo();
    expect(findProject('@vielzeug/ore', repo)).toEqual({ folder: 'packages/ore', version: '1.0.4' });
  });

  it('throws a clear error listing valid packages for an unknown name', () => {
    const repo = makeRepo();
    expect(() => findProject('@vielzeug/does-not-exist', repo)).toThrow(/Unknown package.*@vielzeug\/does-not-exist/s);
    expect(() => findProject('@vielzeug/does-not-exist', repo)).toThrow(/@vielzeug\/ore/);
  });
});
