import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectAiReferenceSources,
  extractAiReferences,
  findDanglingAiReferences,
  isAiReferenceSource,
  patchPackagesReference,
  renderPackagesTable,
} from '../sync-ai-data.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof renderPackagesTable).toBe('function');
  });
});

describe('renderPackagesTable() / patchPackagesReference()', () => {
  it('renders a readable packages table from manifest data', () => {
    const table = renderPackagesTable([
      {
        slug: 'refine',
        name: '@vielzeug/refine',
        description: 'Components',
        dependencies: ['ore', 'ripple'],
        optionalPeers: [],
        peerDependencies: [],
      },
    ]);

    expect(table).toContain('| Package | Description | Dependencies | Required peers | Optional peers |');
    expect(table).toContain('| `@vielzeug/refine` | Components | `ore`, `ripple` | — | — |');
  });

  it('patches the generated table block in the packages reference', () => {
    const source = [
      '# Package Reference',
      '',
      '<!-- GENERATED:packages-table:BEGIN -->',
      '<!-- GENERATED:packages-table:END -->',
    ].join('\n');

    const patched = patchPackagesReference(source, [
      {
        slug: 'spell',
        name: '@vielzeug/spell',
        description: 'Schema validation',
        dependencies: ['arsenal'],
        optionalPeers: [],
        peerDependencies: [],
      },
    ]);

    expect(patched).toMatch(/`@vielzeug\/spell`/);
    expect(patched).toMatch(/Schema validation/);
  });
});

describe('collectAiReferenceSources()', () => {
  it('includes text sources across the repo and skips vendor, build, and changelog files', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ai-reference-sources-test-'));
    try {
      for (const file of [
        '.agents/conventions.md',
        '.agents/skills/review/SKILL.md',
        'AGENTS.md',
        '.github/copilot-instructions.md',
        'packages/spell/CHANGELOG.md',
        'packages/spell/src/index.ts',
        'packages/spell/dist/index.js',
        'docs/.vitepress/config.ts',
        'node_modules/dep/README.md',
        'assets/logo.png',
      ]) {
        const absPath = path.join(root, file);
        mkdirSync(path.dirname(absPath), { recursive: true });
        writeFileSync(absPath, '');
      }

      expect(collectAiReferenceSources(root)).toEqual([
        '.agents/conventions.md',
        '.agents/skills/review/SKILL.md',
        '.github/copilot-instructions.md',
        'AGENTS.md',
        'docs/.vitepress/config.ts',
        'packages/spell/src/index.ts',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('recognizes sources with Windows path separators', () => {
    expect(isAiReferenceSource('.github\\copilot-instructions.md')).toBe(true);
    expect(isAiReferenceSource('packages\\spell\\src\\index.ts')).toBe(true);
    expect(isAiReferenceSource('packages\\spell\\CHANGELOG.md')).toBe(false);
  });
});

describe('extractAiReferences()', () => {
  it('extracts every distinct .agents/... path token', () => {
    const text =
      'See `.agents/conventions.md` and `.agents/skills/build/SKILL.md`. Also `.agents/conventions.md` again.';
    expect(extractAiReferences(text)).toEqual(['.agents/conventions.md', '.agents/skills/build/SKILL.md']);
  });

  it('ignores templated placeholders containing "<"', () => {
    expect(extractAiReferences('Load `.agents/skills/<name>/SKILL.md` and `.agents/reference/<file>.md`.')).toEqual([]);
  });

  it('returns an empty list when there are no references', () => {
    expect(extractAiReferences('Nothing to see here.')).toEqual([]);
  });
});

describe('findDanglingAiReferences()', () => {
  it('reports a reference that fails the fileExists check', () => {
    const dangling = findDanglingAiReferences({ 'AGENTS.md': 'See .agents/ghost.md for details.' }, () => false);

    expect(dangling).toEqual([{ file: 'AGENTS.md', ref: '.agents/ghost.md' }]);
  });

  it('reports nothing when every reference resolves', () => {
    const dangling = findDanglingAiReferences({ 'AGENTS.md': 'See .agents/conventions.md.' }, () => true);

    expect(dangling).toEqual([]);
  });

  it('checks references across multiple files independently', () => {
    const exists = new Set(['.agents/conventions.md']);
    const dangling = findDanglingAiReferences(
      {
        'AGENTS.md': 'See .agents/conventions.md.',
        'packages/AGENTS.md': 'See .agents/missing.md.',
      },
      (ref) => exists.has(ref),
    );

    expect(dangling).toEqual([{ file: 'packages/AGENTS.md', ref: '.agents/missing.md' }]);
  });
});
