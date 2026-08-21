import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTaskDocumentsExist,
  assertValidPackages,
  assertValidTasks,
  collectAiReferenceSources,
  extractAiReferences,
  findDanglingAiReferences,
  isAiReferenceSource,
  mergePackageData,
  patchPackagesReference,
  renderPackagesTable,
  syncTaskAdapters,
  taskStubContent,
} from '../sync-ai-data.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof renderPackagesTable).toBe('function');
  });
});

describe('assertValidTasks()', () => {
  it('accepts well-formed task metadata', () => {
    expect(() =>
      assertValidTasks([
        { description: 'Review.', key: 'review' },
        { description: 'Build.', key: 'build' },
      ]),
    ).not.toThrow();
  });

  it('rejects duplicate task keys', () => {
    expect(() =>
      assertValidTasks([
        { description: 'Analyze.', key: 'analyze' },
        { description: 'Analyze.', key: 'analyze' },
      ]),
    ).toThrow(/duplicate task key/);
  });

  it('rejects invalid task keys', () => {
    expect(() => assertValidTasks([{ description: 'Bad.', key: 'Bad Key' }])).toThrow(/must match/);
  });

  it('rejects fields owned by canonical task documents', () => {
    expect(() => assertValidTasks([{ description: 'Analyze.', inputs: ['scope'], key: 'analyze' }])).toThrow(
      /unsupported fields: inputs/,
    );
  });
});

describe('assertTaskDocumentsExist()', () => {
  it('rejects a missing canonical task document', () => {
    expect(() => assertTaskDocumentsExist([{ key: 'missing' }], '/does-not-exist')).toThrow(
      /canonical task document/,
    );
  });
});

describe('assertValidPackages()', () => {
  it('rejects a package name that does not match its slug', () => {
    expect(() =>
      assertValidPackages([
        { category: 'Utilities', description: 'Utility', name: '@vielzeug/other', slug: 'tool' },
      ]),
    ).toThrow(/must use name/);
  });

  it('rejects an unsupported documentation contract', () => {
    expect(() =>
      assertValidPackages([
        {
          category: 'Utilities',
          description: 'Utility',
          docsContract: 'unsupported',
          name: '@vielzeug/tool',
          slug: 'tool',
        },
      ]),
    ).toThrow(/invalid docsContract/);
  });
});

describe('taskStubContent()', () => {
  it('points adapter stubs at the new task doc path', () => {
    const content = taskStubContent({
      description: 'Update docs with source-backed rules.',
      key: 'document',
    });
    expect(content).toMatch(/# document/);
    expect(content).toMatch(/\.ai\/tasks\/document\.md/);
    expect(content).not.toMatch(/## Inputs|## Load/);
  });

  it('serializes a description containing a colon safely', () => {
    expect(taskStubContent({ description: 'Review: architecture.', key: 'review' })).toMatch(
      /description: "Review: architecture\."/,
    );
  });
});

describe('mergePackageData()', () => {
  it('overwrites live dependency fields while preserving curated metadata', () => {
    const merged = mergePackageData(
      [
        {
          slug: 'forge',
          category: 'Forms',
          description: 'Form state',
          name: '@vielzeug/forge',
          dependencies: [],
          optionalPeers: [],
        },
      ],
      [{ slug: 'forge', dependencies: ['arsenal', 'ripple'], optionalPeers: [], peerDependencies: ['spell'] }],
    );

    expect(merged).toEqual([
      {
        slug: 'forge',
        category: 'Forms',
        description: 'Form state',
        name: '@vielzeug/forge',
        dependencies: ['arsenal', 'ripple'],
        peerDependencies: ['spell'],
      },
    ]);
  });

  it('rejects curated metadata missing a real package', () => {
    expect(() => mergePackageData([], [{ slug: 'forge', dependencies: [], optionalPeers: [] }])).toThrow(
      /missing curated metadata/,
    );
  });

  it('rejects stale curated entries for removed packages', () => {
    expect(() =>
      mergePackageData(
        [
          {
            slug: 'ghost',
            category: 'Utilities',
            description: 'old',
            name: '@vielzeug/ghost',
            dependencies: [],
            optionalPeers: [],
          },
        ],
        [],
      ),
    ).toThrow(/stale curated entries/);
  });
});

describe('renderPackagesTable() / patchPackagesReference()', () => {
  it('renders a readable packages table', () => {
    const table = renderPackagesTable([
      {
        slug: 'refine',
        name: '@vielzeug/refine',
        category: 'UI',
        description: 'Components',
        dependencies: ['ore', 'ripple'],
        optionalPeers: [],
        peerDependencies: [],
      },
    ]);

    expect(table).toContain(
      '| Package | Category | Description | Dependencies | Required peers | Optional peers |',
    );
    expect(table).toContain(
      '| `@vielzeug/refine` | UI | Components | `ore`, `ripple` | — | — |',
    );
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
        category: 'Validation',
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
  it('includes canonical documents and every generated client entrypoint', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ai-reference-sources-test-'));
    try {
      for (const file of [
        '.ai/README.md',
        '.github/copilot-instructions.md',
        '.junie/AGENTS.md',
        '.claude/commands/review.md',
        '.devin/workflows/review.md',
        'AGENTS.md',
        'CLAUDE.md',
      ]) {
        const absPath = path.join(root, file);
        mkdirSync(path.dirname(absPath), { recursive: true });
        writeFileSync(absPath, '');
      }

      expect(collectAiReferenceSources(root)).toEqual([
        '.ai/README.md',
        '.claude/commands/review.md',
        '.devin/workflows/review.md',
        '.github/copilot-instructions.md',
        '.junie/AGENTS.md',
        'AGENTS.md',
        'CLAUDE.md',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('recognizes client entrypoints with Windows path separators', () => {
    expect(isAiReferenceSource('.github\\copilot-instructions.md', false)).toBe(true);
    expect(isAiReferenceSource('.junie\\AGENTS.md', false)).toBe(true);
    expect(isAiReferenceSource('.claude\\commands\\review.md', false)).toBe(true);
    expect(isAiReferenceSource('.devin\\workflows\\review.md', false)).toBe(true);
  });
});

describe('syncTaskAdapters()', () => {
  it('writes registered adapters and removes orphaned adapter files', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ai-adapters-test-'));
    try {
      mkdirSync(path.join(root, '.claude/commands'), { recursive: true });
      mkdirSync(path.join(root, '.devin/workflows'), { recursive: true });
      writeFileSync(path.join(root, '.claude/commands/obsolete.md'), 'old');
      writeFileSync(path.join(root, '.devin/workflows/obsolete.md'), 'old');

      syncTaskAdapters([{ description: 'Review code.', key: 'review' }], { root });

      expect(readFileSync(path.join(root, '.claude/commands/review.md'), 'utf8')).toMatch(/canonical procedure/);
      expect(readFileSync(path.join(root, '.devin/workflows/review.md'), 'utf8')).toMatch(/canonical procedure/);
      expect(() => readFileSync(path.join(root, '.claude/commands/obsolete.md'), 'utf8')).toThrow();
      expect(() => readFileSync(path.join(root, '.devin/workflows/obsolete.md'), 'utf8')).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('extractAiReferences()', () => {
  it('extracts every distinct .ai/... path token', () => {
    const text = 'See `.ai/core/policy.md` and `.ai/data/packages.json`. Also `.ai/core/policy.md` again.';
    expect(extractAiReferences(text)).toEqual(['.ai/core/policy.md', '.ai/data/packages.json']);
  });

  it('ignores templated placeholders containing "<"', () => {
    expect(extractAiReferences('Load `.ai/tasks/<task>.md`.')).toEqual([]);
  });

  it('returns an empty list when there are no references', () => {
    expect(extractAiReferences('Nothing to see here.')).toEqual([]);
  });
});

describe('findDanglingAiReferences()', () => {
  it('reports a reference that fails the fileExists check', () => {
    const dangling = findDanglingAiReferences({ 'AGENTS.md': 'See .ai/core/ghost.md for details.' }, () => false);

    expect(dangling).toEqual([{ file: 'AGENTS.md', ref: '.ai/core/ghost.md' }]);
  });

  it('reports nothing when every reference resolves', () => {
    const dangling = findDanglingAiReferences({ 'AGENTS.md': 'See .ai/core/policy.md for details.' }, () => true);

    expect(dangling).toEqual([]);
  });

  it('checks references across multiple files independently', () => {
    const exists = new Set(['.ai/core/policy.md']);
    const dangling = findDanglingAiReferences(
      {
        'AGENTS.md': 'See .ai/core/policy.md.',
        'packages/AGENTS.md': 'See .ai/core/missing.md.',
      },
      (ref) => exists.has(ref),
    );

    expect(dangling).toEqual([{ file: 'packages/AGENTS.md', ref: '.ai/core/missing.md' }]);
  });
});
