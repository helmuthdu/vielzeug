import { describe, expect, it } from 'vitest';

import {
  assertValidManifest,
  jsDataBlock,
  modeTable,
  printPhases,
  printStrArray,
  printStrArrayMap,
  quote,
  scopeNotes,
  scopeTable,
  stubContent,
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
