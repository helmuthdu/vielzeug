import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { generateSnapshot, generatorWatchRoots } from '../../scripts/generator.ts';
import { writeSnapshot } from '../../scripts/write-bundled-data.ts';
import { loadSnapshot, validateSnapshot } from '../snapshot.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('snapshot generation', () => {
  it('builds a complete chunked snapshot from real monorepo inputs', () => {
    const snapshot = generateSnapshot({ repoRoot });

    expect(snapshot.catalog.packages.length).toBeGreaterThan(0);
    expect(snapshot.contents.size).toBe(snapshot.catalog.packages.length);
    expect(snapshot.search).toHaveLength(snapshot.catalog.packages.length);
    expect(snapshot.manifest.schemaVersion).toBe(1);
  });

  it('defines shared generator watch roots', () => {
    expect(generatorWatchRoots(repoRoot)).toEqual([resolve(repoRoot, 'docs'), resolve(repoRoot, 'packages')]);
  });

  it('publishes one static release snapshot and validates it before use', () => {
    const snapshot = generateSnapshot({ projects: ['packages/codex'], repoRoot });
    const target = resolve(repoRoot, 'packages/codex/data-test');

    try {
      writeSnapshot(target, snapshot);

      expect(existsSync(resolve(target, 'manifest.json'))).toBe(true);
      expect(existsSync(resolve(target, 'packages/codex.json'))).toBe(true);
      validateSnapshot(target);
      expect(loadSnapshot(target).catalog.packages.map((pkg) => pkg.slug)).toEqual(['codex']);
    } finally {
      rmSync(target, { force: true, recursive: true });
    }
  });
});
