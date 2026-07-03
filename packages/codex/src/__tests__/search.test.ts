/**
 * Tests for normalisePackage() + scorePackage().
 * All tests operate on NormalisedPackage — created via normalisePackage(makePkg(…)).
 */
import { describe, expect, it } from 'vitest';

import type { BundledPackage } from '../types.js';

import { describeScoreTiers, normalisePackage, scorePackage } from '../search.js';
import { makePkg } from './_fixtures.js';

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------

function pkg(overrides: Partial<BundledPackage> = {}) {
  return normalisePackage(makePkg(overrides));
}

// ---------------------------------------------------------------------------
// normalisePackage
// ---------------------------------------------------------------------------

describe('normalisePackage', () => {
  it('lowercases all string fields', () => {
    const result = pkg({ category: 'STATE', description: 'REACTIVE' });

    expect(result.category).toBe('state');
    expect(result.description).toBe('reactive');
  });

  it('replaces hyphens with spaces in keyword fields', () => {
    const result = pkg({ keywords: ['reactive-signal'] });

    expect(result.keywords).toBe('reactive signal');
  });

  it('preserves raw name as display value', () => {
    expect(pkg({ name: '@vielzeug/my-pkg' }).name).toBe('@vielzeug/my-pkg');
  });

  it('makes hyphenated package names findable by hyphenated query', () => {
    const hit = scorePackage(pkg({ name: '@vielzeug/my-pkg' }), 'my-pkg');

    expect(hit).not.toBeNull();
    expect(hit?.matchedIn).toContain('metadata');
  });

  it('maps apiSource to source field, null when absent', () => {
    expect(pkg({ apiSource: null }).source).toBeNull();
    expect(pkg({ apiSource: 'export function foo() {}' }).source).toContain('export function foo');
  });

  it('normalises doc page content', () => {
    const result = pkg({ availableDocPages: ['api'], docs: { api: 'Use createForm() NOW' } });

    expect(result.docs['api']).toBe('use createform() now');
  });

  it('only includes pages listed in availableDocPages', () => {
    const result = pkg({
      availableDocPages: ['api'],
      docs: { api: 'api content', index: 'index content' },
    });

    expect(result.docs['api']).toBeDefined();
    expect(result.docs['index']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// scorePackage — null cases
// ---------------------------------------------------------------------------

describe('scorePackage — no match', () => {
  it('returns null when query matches nothing', () => {
    expect(scorePackage(pkg({ description: 'A state library', keywords: ['reactive'] }), 'zzz_no_match')).toBeNull();
  });

  it('returns null for whitespace-only query', () => {
    expect(scorePackage(pkg({ description: 'anything' }), '   ')).toBeNull();
  });

  it('returns null for hyphen-only query (normalises to empty terms)', () => {
    expect(scorePackage(pkg({ description: 'anything' }), '-')).toBeNull();
    expect(scorePackage(pkg({ description: 'anything' }), '---')).toBeNull();
  });

  it('returns null when only one of multiple AND terms matches', () => {
    const p = pkg({ description: 'Reactive signal library for state management' });

    expect(scorePackage(p, 'reactive zzz_no_match')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scorePackage — match categories
// ---------------------------------------------------------------------------

describe('scorePackage — match categories', () => {
  it('reports "metadata" for a name match', () => {
    const hit = scorePackage(pkg({ name: '@vielzeug/ripple' }), 'ripple');

    expect(hit?.matchedIn).toContain('metadata');
    expect(hit?.matchedPages).toBeUndefined();
  });

  it('reports "metadata" for a description match', () => {
    const hit = scorePackage(pkg({ description: 'Reactive signals and computed values' }), 'signal');

    expect(hit?.matchedIn).toContain('metadata');
  });

  it('reports "metadata" for a category match', () => {
    const hit = scorePackage(pkg({ category: 'state' }), 'state');

    expect(hit?.matchedIn).toContain('metadata');
  });

  it('reports "keywords" for a keyword match', () => {
    const hit = scorePackage(pkg({ keywords: ['validation'] }), 'validation');

    expect(hit?.matchedIn).toContain('keywords');
    expect(hit?.matchedIn).not.toContain('metadata');
  });

  it('reports "exports" for an export match', () => {
    const hit = scorePackage(pkg({ exports: ['signal', 'computed'] }), 'computed');

    expect(hit?.matchedIn).toContain('exports');
  });

  it('reports "related" for a related match', () => {
    const hit = scorePackage(pkg({ related: ['ripple', 'ore'] }), 'ripple');

    expect(hit?.matchedIn).toContain('related');
  });

  it('reports "docs" and matchedPages for a doc page match', () => {
    const hit = scorePackage(
      pkg({ availableDocPages: ['api'], docs: { api: '# API\nUse createForm() to build forms.' } }),
      'createform',
    );

    expect(hit?.matchedIn).toContain('docs');
    expect(hit?.matchedPages).toContain('api');
  });

  it('reports "source" for an apiSource match', () => {
    const hit = scorePackage(pkg({ apiSource: 'export function createQuery() {}' }), 'createquery');

    expect(hit?.matchedIn).toContain('source');
    expect(hit?.matchedPages).toBeUndefined();
  });

  it('reports "examples" for a REPL example name or code match', () => {
    const hit = scorePackage(
      pkg({ examples: [{ code: 'debounce(fn, 200)', id: 'debounce-basic', name: 'debounce — basic usage' }] }),
      'debounce',
    );

    expect(hit?.matchedIn).toContain('examples');
  });

  it('reports matchedExamples with the ids of every matching example', () => {
    const hit = scorePackage(
      pkg({
        examples: [
          { code: 'debounce(fn, 200)', id: 'debounce-basic', name: 'debounce basics' },
          { code: 'throttle(fn, 200)', id: 'throttle-basic', name: 'throttle basics' },
        ],
      }),
      'basics',
    );

    expect(hit?.matchedExamples).toEqual(['debounce-basic', 'throttle-basic']);
  });

  it('omits matchedExamples when no example matched', () => {
    const hit = scorePackage(pkg({ description: 'reactive state library' }), 'reactive');

    expect(hit?.matchedExamples).toBeUndefined();
  });

  it('collects multiple match categories when several fields match', () => {
    const hit = scorePackage(
      pkg({ description: 'A reactive signal library', keywords: ['reactive', 'signal'] }),
      'reactive',
    );

    expect(hit?.matchedIn).toContain('metadata');
    expect(hit?.matchedIn).toContain('keywords');
  });

  it('collects all matched doc pages across multiple pages', () => {
    const hit = scorePackage(
      pkg({
        availableDocPages: ['index', 'api'],
        docs: { api: 'The createQuery function fetches data.', index: 'Use createQuery to create queries.' },
      }),
      'createquery',
    );

    expect(hit?.matchedPages).toContain('index');
    expect(hit?.matchedPages).toContain('api');
  });
});

// ---------------------------------------------------------------------------
// scorePackage — score tiers
// ---------------------------------------------------------------------------

describe('scorePackage — score tiers', () => {
  it('name match scores highest (>= 3.9)', () => {
    const hit = scorePackage(pkg({ name: '@vielzeug/ripple' }), 'ripple');

    expect(hit?.score).toBeGreaterThanOrEqual(3.9);
  });

  it('description match is metadata tier (>= 3, < name weight)', () => {
    const hit = scorePackage(pkg({ description: 'Reactive signals' }), 'reactive');

    expect(hit?.score).toBeGreaterThanOrEqual(3);
    expect(hit?.score).toBeLessThan(3.9);
  });

  it('name match scores higher than description match', () => {
    const nameHit = scorePackage(pkg({ name: '@vielzeug/ripple' }), 'ripple');
    const descHit = scorePackage(pkg({ description: 'ripple signals library' }), 'ripple');

    expect(nameHit!.score).toBeGreaterThan(descHit!.score);
  });

  it.each<[string, Partial<BundledPackage>, string, number]>([
    ['keywords', { keywords: ['validation'] }, 'validation', 2.5],
    ['exports', { exports: ['signal'] }, 'signal', 2.2],
    ['related', { related: ['ore'] }, 'ore', 2.0],
  ])('%s match scores in 2.x tier (>= expected, < 3)', (_label, overrides, query, minScore) => {
    const hit = scorePackage(pkg(overrides), query);

    expect(hit?.score).toBeGreaterThanOrEqual(minScore);
    expect(hit?.score).toBeLessThan(3);
  });

  it('keywords > exports > related in score order', () => {
    const kwHit = scorePackage(pkg({ keywords: ['forge'] }), 'forge')!;
    const exHit = scorePackage(pkg({ exports: ['forge'] }), 'forge')!;
    const relHit = scorePackage(pkg({ related: ['forge'] }), 'forge')!;

    expect(kwHit.score).toBeGreaterThan(exHit.score);
    expect(exHit.score).toBeGreaterThan(relHit.score);
  });

  it('docs match scores in 1.x tier (> 0, < 2)', () => {
    const hit = scorePackage(pkg({ availableDocPages: ['api'], docs: { api: 'Use createForm()' } }), 'createform');

    expect(hit?.score).toBeGreaterThan(0);
    expect(hit?.score).toBeLessThan(2);
  });

  it('source match scores below docs (> 0, < 1)', () => {
    const hit = scorePackage(pkg({ apiSource: 'export function createQuery() {}' }), 'createquery');

    expect(hit?.score).toBeGreaterThan(0);
    expect(hit?.score).toBeLessThan(1);
  });

  it('examples match scores below docs, above source (>= 0.95, < 1)', () => {
    const hit = scorePackage(
      pkg({ examples: [{ code: '', id: 'x', name: 'createQuery basic usage' }] }),
      'createquery',
    );

    expect(hit?.score).toBeGreaterThanOrEqual(0.95);
    expect(hit?.score).toBeLessThan(1);
  });

  it('multi-match score is the maximum weight, not a sum', () => {
    // Both metadata (3.1) and keywords (2.5) match — score should be the metadata weight
    const hit = scorePackage(pkg({ description: 'A reactive library', keywords: ['reactive'] }), 'reactive');

    expect(hit?.score).toBeGreaterThanOrEqual(3.1);
    expect(hit?.score).toBeLessThan(3.9);
  });
});

// ---------------------------------------------------------------------------
// scorePackage — normalisation
// ---------------------------------------------------------------------------

describe('scorePackage — normalisation', () => {
  it('is case-insensitive in both haystack and query', () => {
    const p = pkg({ description: 'REACTIVE signals' });

    expect(scorePackage(p, 'reactive')).not.toBeNull();
    expect(scorePackage(p, 'REACTIVE')).not.toBeNull();
    expect(scorePackage(p, 'Reactive')).not.toBeNull();
  });

  it('matches hyphenated keywords with space-separated query', () => {
    const hit = scorePackage(pkg({ keywords: ['reactive-signal'] }), 'reactive signal');

    expect(hit).not.toBeNull();
    expect(hit?.matchedIn).toContain('keywords');
  });

  it('multi-word query uses AND logic (all terms must match)', () => {
    const p = pkg({ description: 'Reactive signal library for state management' });

    expect(scorePackage(p, 'reactive signal')).not.toBeNull();
    expect(scorePackage(p, 'reactive zzz_no_match')).toBeNull();
  });

  it('multi-word query matches across separate keyword entries (join-haystack)', () => {
    const p = pkg({ keywords: ['reactive', 'signal'] });

    expect(scorePackage(p, 'reactive signal')).not.toBeNull();
    expect(scorePackage(p, 'reactive signal')?.matchedIn).toContain('keywords');
  });

  it('multi-word query matches across separate export entries (join-haystack)', () => {
    const p = pkg({ exports: ['createQuery', 'createMutation'] });

    expect(scorePackage(p, 'createquery createmutation')).not.toBeNull();
    expect(scorePackage(p, 'createquery createmutation')?.matchedIn).toContain('exports');
  });

  it('matchedIn contains no duplicate categories when multiple metadata fields match', () => {
    const p = pkg({
      category: 'state',
      description: 'Reactive state library',
      name: '@vielzeug/state',
    });
    const hit = scorePackage(p, 'state');

    expect(hit).not.toBeNull();

    const metadataCount = hit!.matchedIn.filter((c) => c === 'metadata').length;

    expect(metadataCount).toBe(1);
  });

  it('matchedIn contains no duplicate docs when multiple pages match', () => {
    const p = pkg({
      availableDocPages: ['index', 'api'],
      docs: { api: 'createForm guide', index: 'createForm overview' },
    });
    const hit = scorePackage(p, 'createform');

    expect(hit).not.toBeNull();

    const docsCount = hit!.matchedIn.filter((c) => c === 'docs').length;

    expect(docsCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// describeScoreTiers — single source of truth for the search-packages tool description
// ---------------------------------------------------------------------------

describe('describeScoreTiers', () => {
  it('lists every tier highest-to-lowest as "label(weight)" joined by " > "', () => {
    expect(describeScoreTiers()).toBe(
      'name(3.9) > category(3.5) > description(3.1) > keywords(2.5) > exports(2.2) > related(2) > docs(1) > examples(0.95) > source(0.9)',
    );
  });
});
