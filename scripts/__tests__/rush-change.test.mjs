import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeChangeFile } from '../rush-change.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe('writeChangeFile()', () => {
  it('writes a change file scoped to the given package, prefixing the scope if missing', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rush-change-test-'));

    const filepath = writeChangeFile('orbit', 'patch', 'fix: stop redundant DOM reads', {
      now: () => 123,
      root,
    });

    expect(filepath).toBe(path.join(root, 'common/changes/@vielzeug/orbit/agent_123.json'));
    expect(JSON.parse(readFileSync(filepath, 'utf8'))).toEqual({
      changes: [{ comment: 'fix: stop redundant DOM reads', packageName: '@vielzeug/orbit', type: 'patch' }],
      email: 'agent@vielzeug',
      packageName: '@vielzeug/orbit',
    });
  });

  it('accepts an already-scoped package name unchanged', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rush-change-test-'));
    const filepath = writeChangeFile('@vielzeug/orbit', 'minor', 'feat: add x', { now: () => 1, root });
    expect(filepath).toContain(`${path.sep}@vielzeug${path.sep}orbit${path.sep}`);
  });

  it('creates common/changes/<pkg>/ when it does not exist yet', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rush-change-test-'));
    writeChangeFile('orbit', 'patch', 'msg', { now: () => 1, root });
    expect(existsSync(path.join(root, 'common/changes/@vielzeug/orbit'))).toBe(true);
  });

  it('rejects an invalid bump type', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rush-change-test-'));
    expect(() => writeChangeFile('orbit', 'bogus', 'msg', { root })).toThrow(/Invalid bump type "bogus"/);
  });
});
