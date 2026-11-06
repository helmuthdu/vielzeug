import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { listChangeFiles } from '../lib/change-files.mjs';

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'change-files-'));
  roots.push(root);
  return root;
}

describe('listChangeFiles()', () => {
  it('returns an empty list for a missing changes directory', () => {
    expect(listChangeFiles(join(tempRoot(), 'changes'))).toEqual([]);
  });

  it('walks the two-level @vielzeug/<name>/ layout recursively', () => {
    const changesDir = join(tempRoot(), 'changes');
    mkdirSync(join(changesDir, '@vielzeug', 'ore'), { recursive: true });
    mkdirSync(join(changesDir, '@vielzeug', 'ripple'), { recursive: true });
    writeFileSync(join(changesDir, '@vielzeug', 'ore', 'agent_1.json'), '{}');
    writeFileSync(join(changesDir, '@vielzeug', 'ripple', 'agent_2.json'), '{}');

    expect(listChangeFiles(changesDir).sort()).toEqual(['@vielzeug/ore/agent_1.json', '@vielzeug/ripple/agent_2.json']);
  });

  it('ignores non-json files', () => {
    const changesDir = join(tempRoot(), 'changes');
    mkdirSync(join(changesDir, '@vielzeug', 'ore'), { recursive: true });
    writeFileSync(join(changesDir, '@vielzeug', 'ore', 'README.md'), 'not a change file');

    expect(listChangeFiles(changesDir)).toEqual([]);
  });
});
