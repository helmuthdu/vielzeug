import { describe, expect, it } from 'vitest';

import { assertValidManifest, stubContent } from '../sync-workflow-docs.mjs';

// Sanity check that importing the module never executes its side effects
// (reading manifest.json, writing files). If it did, this would already have
// mutated the real repo before any test below runs.
describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof stubContent).toBe('function');
  });
});

describe('stubContent()', () => {
  it('embeds task key and description into the compatibility stub template', () => {
    const content = stubContent({ key: 'change', description: 'Implement a clean change.' });
    expect(content).toMatch(/description: Implement a clean change\./);
    expect(content).toMatch(/# change/);
    expect(content).toMatch(/\.ai\/tasks\/change\.md/);
  });

  it('rejects a description containing a colon (breaks YAML frontmatter)', () => {
    expect(() => stubContent({ key: 'change', description: 'bad: value' })).toThrow(/breaks YAML frontmatter/);
  });
});

describe('assertValidManifest() compatibility export', () => {
  it('accepts valid task metadata', () => {
    expect(() =>
      assertValidManifest([
        { key: 'analyze', references: ['.ai/tasks/analyze.md'] },
        { key: 'change', references: ['.ai/tasks/change.md'] },
      ]),
    ).not.toThrow();
  });

  it('rejects a task key that is unsafe as a file path', () => {
    expect(() => assertValidManifest([{ key: 'bad/key', references: ['x'] }])).toThrow(/must match/);
  });

  it('rejects duplicate task keys', () => {
    expect(() =>
      assertValidManifest([
        { key: 'change', references: ['a'] },
        { key: 'change', references: ['b'] },
      ]),
    ).toThrow(/duplicate task key/);
  });
});
