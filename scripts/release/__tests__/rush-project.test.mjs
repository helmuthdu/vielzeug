import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findProject, listProjectNames } from '../rush-project.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function makeRepo() {
  root = mkdtempSync(path.join(tmpdir(), 'rush-project-test-'));
  writeFileSync(
    path.join(root, 'rush.json'),
    JSON.stringify({ projects: [{ packageName: '@vielzeug/ore', projectFolder: 'packages/ore' }] }),
  );
  mkdirSync(path.join(root, 'packages', 'ore'), { recursive: true });
  writeFileSync(
    path.join(root, 'packages', 'ore', 'package.json'),
    JSON.stringify({ name: '@vielzeug/ore', version: '1.0.4' }),
  );
  return root;
}

describe('listProjectNames()', () => {
  it('lists every declared package name', () => {
    const repo = makeRepo();
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
