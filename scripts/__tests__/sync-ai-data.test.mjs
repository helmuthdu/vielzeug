import { describe, expect, it } from 'vitest';

import {
  assertValidTasks,
  extractAiReferences,
  findDanglingAiReferences,
  mergePackageData,
  patchPackagesReference,
  renderPackagesTable,
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
        { key: 'analyze', references: ['.ai/tasks/analyze.md'] },
        { key: 'change', references: ['.ai/tasks/change.md'] },
      ]),
    ).not.toThrow();
  });

  it('rejects duplicate task keys', () => {
    expect(() =>
      assertValidTasks([
        { key: 'analyze', references: ['a'] },
        { key: 'analyze', references: ['b'] },
      ]),
    ).toThrow(/duplicate task key/);
  });

  it('rejects invalid task keys', () => {
    expect(() => assertValidTasks([{ key: 'Bad Key', references: ['a'] }])).toThrow(/must match/);
  });

  it('rejects tasks without references', () => {
    expect(() => assertValidTasks([{ key: 'analyze', references: [] }])).toThrow(/at least one reference/);
  });
});

describe('taskStubContent()', () => {
  it('points adapter stubs at the new task doc path', () => {
    const content = taskStubContent({ key: 'docs', description: 'Sync docs with source.' });
    expect(content).toMatch(/# docs/);
    expect(content).toMatch(/\.ai\/tasks\/docs\.md/);
  });

  it('rejects descriptions that would break YAML frontmatter', () => {
    expect(() => taskStubContent({ key: 'docs', description: 'bad: value' })).toThrow(/YAML frontmatter/);
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
          domOutput: false,
          name: '@vielzeug/forge',
          dependencies: [],
          optionalPeers: [],
        },
      ],
      [{ slug: 'forge', dependencies: ['arsenal', 'ripple'], optionalPeers: [] }],
    );

    expect(merged).toEqual([
      {
        slug: 'forge',
        category: 'Forms',
        description: 'Form state',
        domOutput: false,
        name: '@vielzeug/forge',
        dependencies: ['arsenal', 'ripple'],
        optionalPeers: [],
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
            domOutput: false,
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
        domOutput: true,
        dependencies: ['ore', 'ripple'],
        optionalPeers: [],
        testCommand: 'pnpm --filter @vielzeug/refine test',
      },
    ]);

    expect(table).toContain('| Package | Category | DOM | Description | Dependencies | Optional peers | Test command |');
    expect(table).toContain('| `@vielzeug/refine` | UI | yes | Components | `ore`, `ripple` | — | `pnpm --filter @vielzeug/refine test` |');
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
        domOutput: false,
        dependencies: ['arsenal'],
        optionalPeers: [],
      },
    ]);

    expect(patched).toMatch(/`@vielzeug\/spell`/);
    expect(patched).toMatch(/Schema validation/);
  });
});

describe('extractAiReferences()', () => {
  it('extracts every distinct .ai/... path token', () => {
    const text = 'See `.ai/core/policy.md` and `.ai/data/packages.json`. Also `.ai/core/policy.md` again.';
    expect(extractAiReferences(text)).toEqual(['.ai/core/policy.md', '.ai/data/packages.json']);
  });

  it('ignores templated placeholders containing "<"', () => {
    expect(extractAiReferences('Store state under `.ai/state/<scope>.json`.')).toEqual([]);
  });

  it('returns an empty list when there are no references', () => {
    expect(extractAiReferences('Nothing to see here.')).toEqual([]);
  });
});

describe('findDanglingAiReferences()', () => {
  it('reports a reference that fails the fileExists check', () => {
    const dangling = findDanglingAiReferences(
      { 'AGENTS.md': 'See .ai/core/ghost.md for details.' },
      () => false,
    );

    expect(dangling).toEqual([{ file: 'AGENTS.md', ref: '.ai/core/ghost.md' }]);
  });

  it('reports nothing when every reference resolves', () => {
    const dangling = findDanglingAiReferences(
      { 'AGENTS.md': 'See .ai/core/policy.md for details.' },
      () => true,
    );

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

