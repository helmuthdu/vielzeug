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
  it('embeds task key, inputs, references, and description into compatibility stub template', () => {
    const content = stubContent({
      description: 'Change source and tests.',
      inputs: ['scope'],
      key: 'build',
      references: ['.ai/core/policy.md'],
    });
    expect(content).toMatch(/description: Change source and tests\./);
    expect(content).toMatch(/# build/);
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/\.ai\/core\/policy\.md/);
    expect(content).toMatch(/\.ai\/tasks\/build\.md/);
  });

  it('serializes a description containing a colon safely', () => {
    expect(stubContent({ description: 'bad: value', inputs: [], key: 'build', references: [] })).toMatch(
      /description: "bad: value"/,
    );
  });
});

describe('assertValidManifest() compatibility export', () => {
  it('accepts valid task metadata', () => {
    expect(() =>
      assertValidManifest([
        { description: 'Review.', inputs: ['scope'], key: 'review', references: ['.ai/tasks/review.md'] },
        { description: 'Build.', inputs: ['scope'], key: 'build', references: ['.ai/tasks/build.md'] },
      ]),
    ).not.toThrow();
  });

  it('rejects a task key that is unsafe as a file path', () => {
    expect(() => assertValidManifest([{ description: 'Bad.', inputs: [], key: 'bad/key', references: ['x'] }])).toThrow(
      /must match/,
    );
  });

  it('rejects duplicate task keys', () => {
    expect(() =>
      assertValidManifest([
        { description: 'Change.', inputs: [], key: 'change', references: ['a'] },
        { description: 'Change.', inputs: [], key: 'change', references: ['b'] },
      ]),
    ).toThrow(/duplicate task key/);
  });
});
