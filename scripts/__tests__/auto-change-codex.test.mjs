import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ensureCodexChangeFile } from '../auto-change-codex.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe('ensureCodexChangeFile()', () => {
  it('writes a patch change file for codex when none is pending', () => {
    root = mkdtempSync(path.join(tmpdir(), 'auto-change-codex-test-'));

    const filepath = ensureCodexChangeFile({ now: () => 123, root });

    expect(filepath).toBe(path.join(root, 'common/changes/@vielzeug/codex/agent_123.json'));
    expect(readdirSync(path.dirname(filepath))).toEqual(['agent_123.json']);
  });

  it('skips and returns null when a codex change file is already pending', () => {
    root = mkdtempSync(path.join(tmpdir(), 'auto-change-codex-test-'));
    const dir = path.join(root, 'common/changes/@vielzeug/codex');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'agent_1.json'), '{}');

    expect(ensureCodexChangeFile({ now: () => 456, root })).toBeNull();
    expect(readdirSync(dir)).toEqual(['agent_1.json']);
  });

  it('does not treat a non-json file in the dir as a pending change', () => {
    root = mkdtempSync(path.join(tmpdir(), 'auto-change-codex-test-'));
    const dir = path.join(root, 'common/changes/@vielzeug/codex');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, '.gitkeep'), '');

    const filepath = ensureCodexChangeFile({ now: () => 789, root });
    expect(filepath).toBe(path.join(dir, 'agent_789.json'));
  });
});
