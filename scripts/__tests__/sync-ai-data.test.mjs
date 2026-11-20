import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectAiReferenceSources,
  extractAiReferences,
  extractCitedPaths,
  extractReadWhen,
  checkRootSize,
  findBadCitations,
  findBadFilteredCitations,
  findBadToolCitations,
  findBadSymbolCitations,
  findDanglingAiReferences,
  findMissingReadWhen,
  isAiReferenceSource,
  patchAgentsIndex,
  patchPackagesNavigation,
  patchPackagesReference,
  patchSkillPackages,
  renderPackagesNavigation,
  renderPackagesTable,
  renderSkillPackages,
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
    expect(table).toContain('| `@vielzeug/refine` | Components | `ore`, `ripple` | N/A | N/A |');
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

describe('renderSkillPackages() / patchSkillPackages()', () => {
  const packages = [
    { slug: 'codex', name: '@vielzeug/codex', description: 'MCP server', dependencies: [], optionalPeers: [], peerDependencies: [] },
    { slug: 'ripple', name: '@vielzeug/ripple', description: 'Signals', dependencies: [], optionalPeers: [], peerDependencies: [] },
    { slug: 'spell', name: '@vielzeug/spell', description: '', dependencies: [], optionalPeers: [], peerDependencies: [] },
  ];

  it('renders a flat list and excludes the codex tooling package', () => {
    const list = renderSkillPackages(packages);

    expect(list).toBe(['- `@vielzeug/ripple`: Signals', '- `@vielzeug/spell`: N/A'].join('\n'));
  });

  it('patches the generated block in the consumer skill', () => {
    const source = ['# Vielzeug', '', '<!-- GENERATED:skill-packages:BEGIN -->', '<!-- GENERATED:skill-packages:END -->', '', '## Done when'].join(
      '\n',
    );

    const patched = patchSkillPackages(source, packages);

    expect(patched).toContain('- `@vielzeug/ripple`: Signals');
    expect(patched).not.toContain('@vielzeug/codex');
    expect(patched.endsWith('## Done when')).toBe(true);
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
  it('ignores home-directory contracts while retaining repository references', () => {
    expect(
      extractAiReferences(
        'Load `~/.agents/klugzeug/contract.md` and `.agents/conventions.md`.',
      ),
    ).toEqual(['.agents/conventions.md']);
  });

  it('does not treat home-directory workflow skill paths as repository references', () => {
    expect(
      extractAiReferences('Procedure: `~/.agents/skills/build/SKILL.md`; conventions: `.agents/conventions.md`.'),
    ).toEqual(['.agents/conventions.md']);
  });

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

describe('renderPackagesNavigation() / patchPackagesNavigation()', () => {
  const packages = [
    {
      slug: 'spell',
      name: '@vielzeug/spell',
      subpaths: ['.', './json', './predicates'],
      scripts: ['build', 'lint', 'test', 'test:types', 'typecheck'],
    },
    { slug: 'assay', name: '@vielzeug/assay', subpaths: ['.'], scripts: ['build', 'lint', 'test'] },
  ];
  const hasDocs = (slug) => slug === 'spell';
  const hasAgents = (slug) => slug === 'spell';

  it('renders subpaths, docs, agents link, and notable scripts', () => {
    const table = renderPackagesNavigation(packages, { hasDocs, hasAgents });

    expect(table).toContain('`@vielzeug/spell/json`, `@vielzeug/spell/predicates`');
    expect(table).toContain('[`docs/spell/`](../../docs/spell/)');
    expect(table).toContain('[`packages/spell/AGENTS.md`](../../packages/spell/AGENTS.md)');
    expect(table).toContain('`test:types`');
    expect(table).toContain('`typecheck`');
    expect(table).not.toContain('`build`');
  });

  it('marks root-only packages and missing extras as N/A', () => {
    const table = renderPackagesNavigation(packages, { hasDocs, hasAgents });
    const assayRow = table.split('\n').find((line) => line.includes('assay'));

    expect(assayRow).toContain('root only');
    expect(assayRow).toContain('N/A');
  });

  it('patches the generated navigation block', () => {
    const source = [
      '<!-- GENERATED:packages-navigation:BEGIN -->',
      '<!-- GENERATED:packages-navigation:END -->',
    ].join('\n');

    expect(patchPackagesNavigation(source, packages, { hasDocs, hasAgents })).toContain('@vielzeug/spell');
  });
});

describe('extractReadWhen() / findMissingReadWhen() / patchAgentsIndex()', () => {
  it('extracts the read-when condition', () => {
    expect(extractReadWhen('# AGENTS.md: x\n\n> Read when: editing `docs/` pages.\n')).toBe('editing `docs/` pages.');
    expect(extractReadWhen('# AGENTS.md: x\n\nNo condition here.\n')).toBeNull();
  });

  it('reports subtree files without a condition, never the root file', () => {
    const missing = findMissingReadWhen({
      'AGENTS.md': '# root\nno condition needed\n',
      'docs/AGENTS.md': '# docs\nno condition\n',
      'scripts/AGENTS.md': '# scripts\n\n> Read when: editing scripts.\n',
    });

    expect(missing).toEqual(['docs/AGENTS.md']);
  });

  it('renders and patches the index block', () => {
    const source = ['<!-- GENERATED:agents-index:BEGIN -->', '<!-- GENERATED:agents-index:END -->'].join('\n');
    const patched = patchAgentsIndex(source, [['docs/AGENTS.md', 'editing docs.']]);

    expect(patched).toContain('[`docs/AGENTS.md`](./docs/AGENTS.md): editing docs.');
  });
});

describe('extractCitedPaths()', () => {
  it('keeps root-anchored backticked paths and skips placeholders, globs, and bare roots', () => {
    const text = [
      'see `packages/refine/src/` and `docs/codex/tools.md`',
      'placeholder `packages/<name>/src/`, glob `scripts/**`',
      'bare root `changes/` names the concept',
      'template `.agents/...` is not a citation',
      'unrooted `workflows/ci.yml` is left alone',
    ].join('\n');

    expect(extractCitedPaths(text).sort()).toEqual(['docs/codex/tools.md', 'packages/refine/src/']);
  });
});

describe('findBadCitations()', () => {
  const options = { rootScripts: new Set(['build', 'test']), fileExists: () => true };

  it('flags a bare bun run citation that is not a root script', () => {
    const bad = findBadCitations({ 'packages/x/AGENTS.md': 'run `bun run test:e2e` now' }, options);

    expect(bad).toEqual([
      { file: 'packages/x/AGENTS.md', citation: 'bun run test:e2e', reason: 'not a root script (use --filter or a cd block)' },
    ]);
  });

  it('accepts root scripts, --filter citations, and cd blocks', () => {
    const content = [
      '`bun run build` at root',
      '`bun run --filter @vielzeug/refine test:e2e`',
      '```bash',
      'cd packages/refine',
      'bun run test:e2e',
      '```',
    ].join('\n');

    expect(findBadCitations({ 'packages/refine/AGENTS.md': content }, options)).toEqual([]);
  });

  it('flags a missing cited path but resolves package-local scripts against the owner', () => {
    const exists = new Set(['packages/refine/src/index.ts', 'packages/codex/scripts/generator.ts']);
    const bad = findBadCitations(
      {
        'packages/refine/AGENTS.md': 'entry `packages/refine/src/index.ts`, ghost `packages/refine/src/nope.ts`',
        'packages/codex/AGENTS.md': 'generator `scripts/generator.ts`',
      },
      { rootScripts: new Set(), fileExists: (rel) => exists.has(rel) },
    );

    expect(bad).toEqual([{ file: 'packages/refine/AGENTS.md', citation: 'packages/refine/src/nope.ts', reason: 'path does not exist' }]);
  });

  it('ignores files that are not citation sources', () => {
    expect(findBadCitations({ 'docs/index.md': '`bun run ghost`' }, { rootScripts: new Set() })).toEqual([]);
  });
});

describe('findBadFilteredCitations()', () => {
  it('flags a --filter citation for a script the package lacks', () => {
    const packageScripts = new Map([['refine', new Set(['test:e2e'])]]);
    const bad = findBadFilteredCitations(
      {
        'AGENTS.md': '`bun run --filter @vielzeug/refine test:e2e` ok, `bun run --filter @vielzeug/refine ghost` bad',
      },
      packageScripts,
    );

    expect(bad).toEqual([
      { file: 'AGENTS.md', citation: 'bun run --filter @vielzeug/refine ghost', reason: 'package has no such script' },
    ]);
  });

  it('flags a --filter citation for a package that does not exist', () => {
    const packageScripts = new Map([['refine', new Set(['test:e2e'])]]);
    const bad = findBadFilteredCitations({ 'AGENTS.md': '`bun run --filter @vielzeug/ghost build`' }, packageScripts);

    expect(bad).toEqual([{ file: 'AGENTS.md', citation: 'bun run --filter @vielzeug/ghost build', reason: 'no such package' }]);
  });
});

describe('findBadSymbolCitations()', () => {
  it('flags a symbol missing from a resolvable cited file', () => {
    const files = { 'vite.config.ts': 'export const realThing = 1;' };
    const readFile = (rel) => {
      if (rel in files) return files[rel];
      throw new Error('ENOENT');
    };
    const bad = findBadSymbolCitations(
      { 'AGENTS.md': 'root `vite.config.ts` (`ghostSymbol`) and root `vite.config.ts` (`realThing`)' },
      readFile,
    );

    expect(bad).toEqual([{ file: 'AGENTS.md', citation: '`vite.config.ts` (`ghostSymbol`)', reason: 'symbol not found in cited file' }]);
  });

  it('leaves prose-relative file tokens alone', () => {
    const readFile = () => {
      throw new Error('ENOENT');
    };

    expect(findBadSymbolCitations({ '.github/AGENTS.md': '`config.ts` (`anything`)' }, readFile)).toEqual([]);
  });
});

describe('findBadToolCitations()', () => {
  it('flags unknown backticked get/refine tools in citation sources', () => {
    const tools = new Set(['get-docs', 'list-packages', 'refine-get-tokens', 'search']);
    const bad = findBadToolCitations(
      {
        'AGENTS.md':
          '`get-docs`, `list-packages`, `search`, and `refine-get-tokens`; stale names: `get-package-info` and `refine-get-widget`',
        'docs/index.md': '`refine-get-widget` is not a citation source',
      },
      tools,
    );

    expect(bad).toEqual([
      { file: 'AGENTS.md', citation: '`get-package-info`', reason: 'no such codex MCP tool' },
      { file: 'AGENTS.md', citation: '`refine-get-widget`', reason: 'no such codex MCP tool' },
    ]);
  });
});

describe('checkRootSize()', () => {
  it('warns above the budget and stays quiet below it', () => {
    expect(checkRootSize('a\nb\nc', 2)).toContain('[SIZE]');
    expect(checkRootSize('a\nb\nc', 10)).toBeNull();
  });
});
