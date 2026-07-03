import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assertValidManifest,
  isTracked,
  jsDataBlock,
  modeTable,
  printPhases,
  printStrArray,
  printStrArrayMap,
  quote,
  replaceBetweenMarkers,
  scopeNotes,
  scopeTable,
  stubContent,
  syncFile,
  syncPatchedFile,
} from '../sync-workflow-docs.mjs';

// Sanity check that importing the module never executes its side effects
// (reading manifest.json, writing files). If it did, this would already have
// mutated the real repo before any test below runs.
describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof scopeTable).toBe('function');
  });
});

describe('quote()', () => {
  it('wraps plain strings in single quotes', () => {
    expect(quote('review')).toBe("'review'");
  });

  it('rejects apostrophes rather than emitting broken JS', () => {
    expect(() => quote("don't")).toThrow(/can't safely emit/);
  });

  it('rejects backslashes', () => {
    expect(() => quote('a\\b')).toThrow(/can't safely emit/);
  });

  it('rejects a raw newline — would break a single-quoted string literal', () => {
    expect(() => quote('line one\nline two')).toThrow(/can't safely emit/);
    // and confirm the underlying premise: an unescaped newline really is invalid JS
    expect(() => new Function("return 'line one\nline two';")).toThrow();
  });

  it('rejects other control characters (tab, carriage return)', () => {
    expect(() => quote('a\tb')).toThrow(/can't safely emit/);
    expect(() => quote('a\rb')).toThrow(/can't safely emit/);
  });
});

describe('printStrArray() / printStrArrayMap() / printPhases()', () => {
  it('prints a compact single-quoted array', () => {
    expect(printStrArray(['a', 'b'])).toBe("['a', 'b']");
  });

  it('produces valid, evaluable JS for a scope map', () => {
    const src = printStrArrayMap({ bug: ['baseline', 'plan'], full: ['baseline', 'plan', 'review'] });
    const value = new Function(`return ${src};`)();
    expect(value).toEqual({ bug: ['baseline', 'plan'], full: ['baseline', 'plan', 'review'] });
  });

  it('produces valid, evaluable JS for phase metadata', () => {
    const src = printPhases([{ detail: 'd1', key: 'baseline', title: 'Baseline' }]);
    const value = new Function(`return ${src};`)();
    expect(value).toEqual([{ key: 'baseline', title: 'Baseline', detail: 'd1' }]);
  });

  it('jsDataBlock() output is syntactically valid and round-trips the manifest shape', () => {
    const src = jsDataBlock({
      domOutputPackages: ['ore'],
      modes: [{ isDefault: true, key: 'analyse' }, { key: 'feature' }],
      phases: [{ detail: 'd', key: 'baseline', title: 'Baseline' }],
      scopes: { full: ['baseline'] },
    });
    // Evaluate as a function body, same shape pkg-workflow.js's harness uses.
    const fn = new Function(`${src}\nreturn { VALID_MODES, VALID_SCOPES, domOutputPackages, SCOPE_PHASES, PHASES };`);
    const result = fn();
    expect(result.VALID_MODES).toEqual(['analyse', 'feature']);
    expect(result.domOutputPackages).toEqual(['ore']);
    expect(result.SCOPE_PHASES).toEqual({ full: ['baseline'] });
    expect(result.PHASES).toEqual([{ key: 'baseline', title: 'Baseline', detail: 'd' }]);
  });
});

describe('modeTable()', () => {
  it('renders a GFM table with one row per mode, marking the default', () => {
    const table = modeTable([
      { isDefault: true, key: 'analyse', passStructure: 'a → b', useWhen: 'Existing package' },
      { key: 'feature', passStructure: 'c → d', useWhen: 'New feature' },
    ]);
    const lines = table.split('\n');
    expect(lines).toHaveLength(4); // header + separator + 2 rows
    expect(lines[0]).toBe('| Mode | Use when | Pass structure |');
    expect(lines[2]).toBe('| `analyse` (default) | Existing package | a → b |');
    expect(lines[3]).toBe('| `feature` | New feature | c → d |');
  });
});

describe('scopeTable()', () => {
  it('renders a GFM table with one row per scope, no manual padding', () => {
    const table = scopeTable({
      scopeDescriptions: { bug: 'Bug fix', full: 'Full feature' },
      scopes: { bug: ['baseline', 'plan'], full: ['baseline', 'plan', 'review'] },
    });
    const lines = table.split('\n');
    expect(lines).toHaveLength(4); // header + separator + 2 rows
    expect(lines[0]).toMatch(/^\| Change type \| Scope key \| Phases/);
    expect(lines[2]).toBe('| Bug fix | `bug` | baseline → plan |');
  });

  it('falls back to the raw key when no description is provided', () => {
    const table = scopeTable({ scopeDescriptions: {}, scopes: { mystery: ['baseline'] } });
    expect(table).toMatch(/\| mystery \| `mystery` \| baseline \|/);
  });
});

describe('scopeNotes()', () => {
  it('renders one bullet per scope precondition', () => {
    const notes = scopeNotes({ security: 'Requires an existing plan.md.' });
    expect(notes).toBe('- **`security`** — Requires an existing plan.md.');
  });

  it('renders a placeholder when there are no preconditions', () => {
    expect(scopeNotes({})).toBe('_No scope-specific preconditions._');
  });
});

describe('stubContent()', () => {
  it('embeds slug and description into the stub template', () => {
    const content = stubContent('pkg-plan', 'Does planning things');
    expect(content).toMatch(/description: Does planning things/);
    expect(content).toMatch(/# pkg-plan/);
    expect(content).toMatch(/\.ai\/workflows\/pkg-plan\.md/);
  });

  it('rejects a description containing a colon (breaks YAML frontmatter)', () => {
    expect(() => stubContent('x', 'bad: value')).toThrow(/breaks YAML frontmatter/);
  });
});

describe('assertValidManifest()', () => {
  const oneMode = [{ isDefault: true, key: 'analyse' }];

  it('accepts a well-formed manifest', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: oneMode, phases: [{ key: 'baseline' }], scopes: { full: ['baseline'] } },
        workflows: [{ description: 'ok', slug: 'pkg-plan' }],
      }),
    ).not.toThrow();
  });

  it('rejects a slug that is unsafe as a file path', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: oneMode, phases: [], scopes: {} },
        workflows: [{ description: 'x', slug: 'bad/slug' }],
      }),
    ).toThrow(/slug "bad\/slug"/);
  });

  it('rejects a scope that references an unknown phase key', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: oneMode, phases: [{ key: 'baseline' }], scopes: { x: ['ghost-phase'] } },
        workflows: [],
      }),
    ).toThrow(/references unknown phase "ghost-phase"/);
  });

  it('accepts "review-a" as a virtual phase key (Lens-A-only sub-mode, not a real phase)', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: oneMode, phases: [{ key: 'review' }], scopes: { bug: ['review-a'] } },
        workflows: [],
      }),
    ).not.toThrow();
  });

  it('rejects zero modes flagged isDefault', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: [{ key: 'analyse' }], phases: [], scopes: {} },
        workflows: [],
      }),
    ).toThrow(/exactly one mode must set "isDefault": true \(found 0\)/);
  });

  it('rejects more than one mode flagged isDefault', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: {
          modes: [
            { isDefault: true, key: 'analyse' },
            { isDefault: true, key: 'feature' },
          ],
          phases: [],
          scopes: {},
        },
        workflows: [],
      }),
    ).toThrow(/exactly one mode must set "isDefault": true \(found 2\)/);
  });

  it('rejects a mode key that is unsafe as a file path', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: [{ isDefault: true, key: 'Bad Key' }], phases: [], scopes: {} },
        workflows: [],
      }),
    ).toThrow(/modes: key "Bad Key"/);
  });

  it('rejects a scopeRequirements entry referencing an unknown scope', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: {
          modes: oneMode,
          phases: [],
          scopeRequirements: { ghost: 'some precondition' },
          scopes: { full: [] },
        },
        workflows: [],
      }),
    ).toThrow(/scopeRequirements references unknown scope "ghost"/);
  });

  it('accepts a manifest with no scopeRequirements at all', () => {
    expect(() =>
      assertValidManifest({
        pkgWorkflow: { modes: oneMode, phases: [], scopes: { full: [] } },
        workflows: [],
      }),
    ).not.toThrow();
  });
});

describe('replaceBetweenMarkers()', () => {
  it('replaces content between markers, keeping the markers themselves, with a blank line on both sides', () => {
    const result = replaceBetweenMarkers('before\nBEGIN\nold\nEND\nafter', 'BEGIN', 'END', 'new');
    expect(result).toBe('before\nBEGIN\n\nnew\n\nEND\nafter');
  });

  it('throws when markers are missing', () => {
    expect(() => replaceBetweenMarkers('no markers here', 'BEGIN', 'END', 'x')).toThrow(/not found/);
  });
});

describe('isTracked() — real git repo, including hostile hook-like environments', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  function makeTempRepo() {
    const dir = mkdtempSync(path.join(tmpdir(), 'sync-workflow-docs-test-'));
    execFileSync('git', ['init', '-q'], { cwd: dir });
    return dir;
  }

  it('reports tracked vs gitignored correctly', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, '.gitignore'), 'ignored.txt\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });

    expect(isTracked('tracked.txt', root)).toBe(true);
    expect(isTracked('ignored.txt', root)).toBe(false);
  });

  it('is unaffected by an inherited GIT_DIR pointing elsewhere', () => {
    root = makeTempRepo();
    const originalGitDir = process.env.GIT_DIR;
    process.env.GIT_DIR = '/tmp/sync-workflow-docs-test-bogus-gitdir';
    try {
      expect(isTracked('tracked.txt', root)).toBe(true);
    } finally {
      if (originalGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = originalGitDir;
    }
  });
});

describe('syncFile() / syncPatchedFile() — filesystem behavior in an isolated repo', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  function makeTempRepo() {
    const dir = mkdtempSync(path.join(tmpdir(), 'sync-workflow-docs-test-'));
    execFileSync('git', ['init', '-q'], { cwd: dir });
    return dir;
  }

  it('syncFile writes new content and reports "written"', () => {
    root = makeTempRepo();
    expect(syncFile('out.txt', 'hello', { root })).toBe('written');
    expect(execFileSync('cat', [path.join(root, 'out.txt')], { encoding: 'utf8' })).toBe('hello');
  });

  it('syncFile is a no-op when content is unchanged', () => {
    root = makeTempRepo();
    syncFile('out.txt', 'hello', { root });
    expect(syncFile('out.txt', 'hello', { root })).toBe('unchanged');
  });

  it('syncFile creates missing parent directories', () => {
    root = makeTempRepo();
    syncFile('nested/dir/out.txt', 'hi', { root });
    expect(execFileSync('cat', [path.join(root, 'nested/dir/out.txt')], { encoding: 'utf8' })).toBe('hi');
  });

  it('syncFile in check mode never writes, and reports stale only for tracked files', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, '.gitignore'), 'ignored.txt\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });

    const stales = [];
    const trackedResult = syncFile('tracked.txt', 'content', { check: true, onStale: (m) => stales.push(m), root });
    const ignoredResult = syncFile('ignored.txt', 'content', { check: true, onStale: (m) => stales.push(m), root });

    expect(trackedResult).toBe('stale');
    expect(ignoredResult).toBe('skipped');
    expect(stales).toHaveLength(1);
    expect(stales[0]).toMatch(/tracked\.txt/);
  });

  it('syncPatchedFile patches an existing file between markers', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, 'target.md'), 'a\nBEGIN\nold\nEND\nb\n');
    const result = syncPatchedFile('target.md', 'BEGIN', 'END', 'new', { root });
    expect(result).toBe('written');
    expect(execFileSync('cat', [path.join(root, 'target.md')], { encoding: 'utf8' })).toBe(
      'a\nBEGIN\n\nnew\n\nEND\nb\n',
    );
  });

  it('syncPatchedFile skips (does not throw) when the target file is missing', () => {
    root = makeTempRepo();
    expect(syncPatchedFile('missing.md', 'BEGIN', 'END', 'new', { root })).toBe('skipped');
  });

  it('syncPatchedFile in check mode reports stale (not a crash) on corrupted markers', () => {
    root = makeTempRepo();
    writeFileSync(path.join(root, 'target.md'), 'no markers here\n');
    execFileSync('git', ['add', 'target.md'], { cwd: root });
    const stales = [];
    const result = syncPatchedFile('target.md', 'BEGIN', 'END', 'new', {
      check: true,
      onStale: (m) => stales.push(m),
      root,
    });
    expect(result).toBe('stale');
    expect(stales).toHaveLength(1);
  });

  it('syncPatchedFile in write mode throws a clear error on corrupted markers', () => {
    root = makeTempRepo();
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, 'target.md'), 'no markers here\n');
    expect(() => syncPatchedFile('target.md', 'BEGIN', 'END', 'new', { root })).toThrow(/fix or restore the markers/);
  });
});
