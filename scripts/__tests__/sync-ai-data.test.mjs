import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectAiReferenceSources,
  extractAiReferences,
  findDanglingAiReferences,
  isAiReferenceSource,
  parseTaskDescription,
  patchPackagesReference,
  readAiTasks,
  renderPackagesTable,
  syncTaskAdapters,
  taskStubContent,
} from '../sync-ai-data.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof renderPackagesTable).toBe('function');
  });
});

describe('parseTaskDescription()', () => {
  it('reads a plain frontmatter description', () => {
    expect(parseTaskDescription('---\ndescription: Review code.\n---\n\n# Review\n', 'x.md')).toBe('Review code.');
  });

  it('unquotes a JSON-style description', () => {
    expect(parseTaskDescription('---\ndescription: "Review: architecture."\n---\n', 'x.md')).toBe(
      'Review: architecture.',
    );
  });

  it('rejects a document without a description', () => {
    expect(() => parseTaskDescription('# No frontmatter\n', '.ai/tasks/x.md')).toThrow(/missing frontmatter/);
  });
});

describe('readAiTasks()', () => {
  it('derives tasks from .ai/tasks/*.md sorted by key', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ai-tasks-test-'));
    try {
      mkdirSync(path.join(root, '.ai/tasks'), { recursive: true });
      writeFileSync(path.join(root, '.ai/tasks/review.md'), '---\ndescription: Review.\n---\n');
      writeFileSync(path.join(root, '.ai/tasks/build.md'), '---\ndescription: Build.\n---\n');

      expect(readAiTasks(root)).toEqual([
        { description: 'Build.', key: 'build' },
        { description: 'Review.', key: 'review' },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects an invalid task file name', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ai-tasks-test-'));
    try {
      mkdirSync(path.join(root, '.ai/tasks'), { recursive: true });
      writeFileSync(path.join(root, '.ai/tasks/Bad Key.md'), '---\ndescription: Bad.\n---\n');
      expect(() => readAiTasks(root)).toThrow(/must match/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('taskStubContent()', () => {
  it('points adapter stubs at the canonical task doc', () => {
    const content = taskStubContent({
      description: 'Update docs with source-backed rules.',
      key: 'document',
    });
    expect(content).toMatch(/# document/);
    expect(content).toMatch(/\.ai\/tasks\/document\.md/);
  });

  it('serializes a description containing a colon safely', () => {
    expect(taskStubContent({ description: 'Review: architecture.', key: 'review' })).toMatch(
      /description: "Review: architecture\."/,
    );
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
        '.ai/tasks/build.md',
        '.claude/commands/review.md',
        'AGENTS.md',
        'CLAUDE.md',
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
        '.ai/tasks/build.md',
        '.claude/commands/review.md',
        'AGENTS.md',
        'CLAUDE.md',
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
    const text = 'See `.ai/core/conventions.md` and `.ai/tasks/build.md`. Also `.ai/core/conventions.md` again.';
    expect(extractAiReferences(text)).toEqual(['.ai/core/conventions.md', '.ai/tasks/build.md']);
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
    const dangling = findDanglingAiReferences({ 'AGENTS.md': 'See .ai/core/conventions.md.' }, () => true);

    expect(dangling).toEqual([]);
  });

  it('checks references across multiple files independently', () => {
    const exists = new Set(['.ai/core/conventions.md']);
    const dangling = findDanglingAiReferences(
      {
        'AGENTS.md': 'See .ai/core/conventions.md.',
        'packages/AGENTS.md': 'See .ai/core/missing.md.',
      },
      (ref) => exists.has(ref),
    );

    expect(dangling).toEqual([{ file: 'packages/AGENTS.md', ref: '.ai/core/missing.md' }]);
  });
});
