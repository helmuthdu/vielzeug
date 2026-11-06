import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateChangeFile, validateChangeFiles } from '../validate-change-files.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function makeChangesDir(files) {
  root = mkdtempSync(path.join(tmpdir(), 'change-files-test-'));
  const changesDir = path.join(root, 'changes');
  for (const [relFile, contents] of Object.entries(files)) {
    const abs = path.join(changesDir, relFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, contents);
  }
  return changesDir;
}

const valid = (comment = 'feat: ore thing') =>
  JSON.stringify({
    changes: [{ comment, packageName: '@vielzeug/ore', type: 'minor' }],
    email: 'agent@vielzeug',
    packageName: '@vielzeug/ore',
  });

describe('validateChangeFile()', () => {
  it('accepts the shape writeChangeFile() writes', () => {
    expect(validateChangeFile(path.join('@vielzeug/ore', 'agent_1.json'), valid())).toEqual([]);
  });

  it('reports unparseable JSON', () => {
    expect(validateChangeFile('@vielzeug/ore/bad.json', '{')).toHaveLength(1);
  });

  it('reports a packageName that does not match its directory', () => {
    const contents = JSON.stringify({
      changes: [{ comment: 'x', packageName: '@vielzeug/orbit', type: 'patch' }],
      packageName: '@vielzeug/orbit',
    });
    const problems = validateChangeFile(path.join('@vielzeug/ore', 'agent_1.json'), contents);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/does not match its directory/);
  });

  it('reports an invalid type and an empty comment', () => {
    const contents = JSON.stringify({
      changes: [
        { comment: 'x', packageName: '@vielzeug/ore', type: 'trivial' },
        { comment: '   ', packageName: '@vielzeug/ore', type: 'patch' },
      ],
      packageName: '@vielzeug/ore',
    });
    expect(validateChangeFile('@vielzeug/ore/agent_1.json', contents)).toHaveLength(2);
  });

  it('reports a missing or empty changes array', () => {
    expect(validateChangeFile('@vielzeug/ore/agent_1.json', JSON.stringify({ packageName: '@vielzeug/ore' }))).toHaveLength(
      1,
    );
  });
});

describe('validateChangeFiles()', () => {
  it('counts every file and collects problems across packages', () => {
    const changesDir = makeChangesDir({
      [path.join('@vielzeug/ore', 'agent_1.json')]: valid(),
      [path.join('@vielzeug/orbit', 'agent_2.json')]: '{ not json',
    });
    const { files, problems } = validateChangeFiles({ changesDir });
    expect(files).toHaveLength(2);
    expect(problems).toHaveLength(1);
  });

  it('passes an empty changes directory', () => {
    const changesDir = makeChangesDir({});
    const { files, problems } = validateChangeFiles({ changesDir });
    expect(files).toEqual([]);
    expect(problems).toEqual([]);
  });
});
