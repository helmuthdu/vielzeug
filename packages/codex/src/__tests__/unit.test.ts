import { describe, expect, it } from 'vitest';

import type { BundledPackage } from '../types.js';

import { loadData, packageMeta, validateBundledData } from '../data.js';
import { parseFrontmatter } from '../frontmatter.js';
import { generateBundledData } from '../generator.js';
import { resolvePort } from '../port.js';
import { scorePackage } from '../search.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePkg(overrides: Partial<BundledPackage> = {}): BundledPackage {
  return {
    apiSource: null,
    availableDocPages: [],
    category: '',
    components: [],
    description: '',
    docs: {},
    exports: [],
    keywords: [],
    name: '@vielzeug/test',
    related: [],
    slug: 'test',
    version: '1.0.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('returns empty object for content with no frontmatter', () => {
    expect(parseFrontmatter('# Hello')).toEqual({});
    expect(parseFrontmatter('')).toEqual({});
  });

  it('parses simple key: value pairs', () => {
    const md = `---\ntitle: My Package\ncategory: state\n---\n# content`;

    expect(parseFrontmatter(md)).toEqual({ category: 'state', title: 'My Package' });
  });

  it('strips surrounding quotes from values', () => {
    const md = `---\ntitle: 'Quoted Title'\ndescription: "Double quoted"\n---`;

    expect(parseFrontmatter(md)).toMatchObject({ description: 'Double quoted', title: 'Quoted Title' });
  });

  it('parses inline arrays', () => {
    const md = `---\nkeywords: [signals, reactive, state]\n---`;

    expect(parseFrontmatter(md)).toEqual({ keywords: ['signals', 'reactive', 'state'] });
  });

  it('parses inline arrays with quoted items', () => {
    const md = `---\nrelated: ['ripple', 'craft']\n---`;

    expect(parseFrontmatter(md)).toEqual({ related: ['ripple', 'craft'] });
  });

  it('parses block sequence arrays', () => {
    const md = `---\nexports:\n  - signal\n  - computed\n  - effect\n---`;

    expect(parseFrontmatter(md)).toEqual({ exports: ['signal', 'computed', 'effect'] });
  });

  it('handles values containing colons', () => {
    const md = `---\nurl: https://example.com/path\n---`;

    expect(parseFrontmatter(md)).toEqual({ url: 'https://example.com/path' });
  });

  it('handles CRLF line endings', () => {
    const md = `---\r\ntitle: Test\r\ncategory: ui\r\n---`;

    expect(parseFrontmatter(md)).toMatchObject({ category: 'ui', title: 'Test' });
  });

  it('skips comment lines (#)', () => {
    const md = `---\n# this is a comment\ntitle: Real\n---`;

    expect(parseFrontmatter(md)).toEqual({ title: 'Real' });
  });

  it('ignores block sequence key with no items (empty sequence body)', () => {
    const md = `---\nexports:\ntitle: After\n---`;

    expect(parseFrontmatter(md)).not.toHaveProperty('exports');
    expect(parseFrontmatter(md)).toHaveProperty('title', 'After');
  });

  it('drops __proto__ key to prevent prototype pollution', () => {
    const md = `---\n__proto__: injected\ntitle: Safe\n---`;
    const result = parseFrontmatter(md);

    expect(result).not.toHaveProperty('__proto__');
    expect(result['title']).toBe('Safe');
  });

  it('drops constructor key to prevent prototype pollution', () => {
    const md = `---\nconstructor: injected\ntitle: Safe\n---`;
    const result = parseFrontmatter(md);

    expect(result).not.toHaveProperty('constructor');
  });
});

// ---------------------------------------------------------------------------
// packageMeta
// ---------------------------------------------------------------------------

describe('packageMeta', () => {
  it('strips docs, apiSource, and components from the output', () => {
    const pkg = makePkg({
      apiSource: 'export function foo() {}',
      components: [{ name: 'sg-button', tagName: 'sg-button' }],
      docs: { api: '# API', index: '# Index' },
    });

    const meta = packageMeta(pkg);

    expect(meta).not.toHaveProperty('docs');
    expect(meta).not.toHaveProperty('apiSource');
    expect(meta).not.toHaveProperty('components');
  });

  it('sets hasSource: true when apiSource is present', () => {
    const pkg = makePkg({ apiSource: 'export {}' });

    expect(packageMeta(pkg).hasSource).toBe(true);
  });

  it('sets hasSource: false when apiSource is null', () => {
    const pkg = makePkg({ apiSource: null });

    expect(packageMeta(pkg).hasSource).toBe(false);
  });

  it('preserves all other fields unchanged', () => {
    const pkg = makePkg({ category: 'state', description: 'A signal library', keywords: ['reactive'] });
    const meta = packageMeta(pkg);

    expect(meta.category).toBe('state');
    expect(meta.description).toBe('A signal library');
    expect(meta.keywords).toEqual(['reactive']);
    expect(meta.slug).toBe('test');
  });
});

// ---------------------------------------------------------------------------
// scorePackage
// ---------------------------------------------------------------------------

describe('scorePackage', () => {
  it('returns null when the term matches nothing', () => {
    const pkg = makePkg({ description: 'A state library', keywords: ['reactive'] });

    expect(scorePackage(pkg, 'zzz_no_match')).toBeNull();
  });

  it('scores metadata matches at 3', () => {
    const pkg = makePkg({ description: 'Reactive signals and computed values' });
    const hit = scorePackage(pkg, 'signal');

    expect(hit).not.toBeNull();
    expect(hit?.score).toBe(3);
    expect(hit?.matchedIn).toContain('metadata');
  });

  it('scores name matches at 3', () => {
    const pkg = makePkg({ name: '@vielzeug/ripple' });
    const hit = scorePackage(pkg, 'ripple');

    expect(hit?.score).toBe(3);
    expect(hit?.matchedIn).toContain('metadata');
  });

  it('scores keyword matches at 2', () => {
    const pkg = makePkg({ keywords: ['schema', 'validation', 'zod-like'] });
    const hit = scorePackage(pkg, 'validation');

    expect(hit?.score).toBe(2);
    expect(hit?.matchedIn).toContain('keywords');
  });

  it('scores doc page matches at 1', () => {
    const pkg = makePkg({
      availableDocPages: ['api'],
      docs: { api: '# API\n\nUse `createForm()` to build forms.' },
    });
    const hit = scorePackage(pkg, 'createform');

    expect(hit?.score).toBe(1);
    expect(hit?.matchedIn).toContain('docs');
    expect(hit?.matchedPages).toContain('api');
  });

  it('scores apiSource matches at 1', () => {
    const pkg = makePkg({ apiSource: 'export function createQuery() {}' });
    const hit = scorePackage(pkg, 'createquery');

    expect(hit?.score).toBe(1);
    expect(hit?.matchedIn).toContain('docs');
    expect(hit?.matchedPages).toContain('source');
  });

  it('collects all match categories (multi-match)', () => {
    // Term matches both metadata AND keywords — both reported, score = max (3)
    const pkg = makePkg({
      description: 'A reactive signal library',
      keywords: ['reactive', 'signal'],
    });
    const hit = scorePackage(pkg, 'reactive');

    expect(hit?.score).toBe(3);
    expect(hit?.matchedIn).toContain('metadata');
    expect(hit?.matchedIn).toContain('keywords');
    expect(hit?.matchedIn.length).toBe(2);
  });

  it('collects multiple matched doc pages', () => {
    const pkg = makePkg({
      availableDocPages: ['index', 'api'],
      docs: {
        api: 'The createQuery function fetches data.',
        index: 'Use createQuery to create queries.',
      },
    });
    const hit = scorePackage(pkg, 'createquery');

    expect(hit?.matchedPages).toContain('index');
    expect(hit?.matchedPages).toContain('api');
  });

  it('matches multi-word queries with AND logic across words', () => {
    const pkg = makePkg({ description: 'Reactive signal library for state management' });

    expect(scorePackage(pkg, 'reactive signal')).not.toBeNull();
    expect(scorePackage(pkg, 'reactive zzz_no_match')).toBeNull();
  });

  it('returns null for a query of only whitespace', () => {
    const pkg = makePkg({ description: 'anything' });

    expect(scorePackage(pkg, '   ')).toBeNull();
  });

  it('reports both "keywords" and "exports" when both match', () => {
    const pkg = makePkg({ exports: ['signal'], keywords: ['signal'] });
    const hit = scorePackage(pkg, 'signal');

    expect(hit?.score).toBe(2);
    expect(hit?.matchedIn).toContain('keywords');
    expect(hit?.matchedIn).toContain('exports');
  });

  it('scores exports array matches at 2 with matchedIn "exports"', () => {
    const pkg = makePkg({ exports: ['signal', 'computed', 'effect'] });
    const hit = scorePackage(pkg, 'signal');

    expect(hit?.score).toBe(2);
    expect(hit?.matchedIn).toContain('exports');
    expect(hit?.matchedIn).not.toContain('keywords');
  });

  it('does not include matchedPages when only metadata matches', () => {
    const pkg = makePkg({ name: '@vielzeug/ripple' });
    const hit = scorePackage(pkg, 'ripple');

    expect(hit?.matchedPages).toBeUndefined();
  });

  it('is case-insensitive in both haystack and query', () => {
    const pkg = makePkg({ description: 'REACTIVE signals' });

    // lowercase query
    expect(scorePackage(pkg, 'reactive')).not.toBeNull();

    // uppercase query — scorePackage lowercases the query internally
    expect(scorePackage(pkg, 'REACTIVE')).not.toBeNull();

    // mixed case
    expect(scorePackage(pkg, 'Reactive')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateBundledData
// ---------------------------------------------------------------------------

describe('generateBundledData', () => {
  it('returns data with packages array and non-empty version', () => {
    const { data } = generateBundledData();

    expect(Array.isArray(data.packages)).toBe(true);
    expect(data.packages.length).toBeGreaterThan(0);
    expect(typeof data.version).toBe('string');
    expect(data.version.length).toBeGreaterThan(0);
  });

  it('returns packages sorted by slug', () => {
    const { data } = generateBundledData();
    const slugs = data.packages.map((p) => p.slug);
    const sorted = [...slugs].sort((a, b) => a.localeCompare(b));

    expect(slugs).toEqual(sorted);
  });

  it('availableDocPages matches the keys present in docs', () => {
    const { data } = generateBundledData();

    for (const pkg of data.packages) {
      const docKeys = Object.keys(pkg.docs).sort();
      const availableSorted = [...pkg.availableDocPages].sort();

      expect(availableSorted).toEqual(docKeys);
    }
  });

  it('does not return hashes when incremental is false', () => {
    const result = generateBundledData({ incremental: false });

    expect(result.hashes).toBeUndefined();
  });

  it('returns hashes with one entry per package when incremental is true', () => {
    const result = generateBundledData({ incremental: true });

    expect(result.hashes).toBeDefined();

    const slugs = result.data.packages.map((p) => p.slug);

    for (const slug of slugs) {
      expect(typeof result.hashes![slug]).toBe('string');
      expect(result.hashes![slug].length).toBeGreaterThan(0);
    }
  });

  it('every package has a name and slug', () => {
    const { data } = generateBundledData();

    for (const pkg of data.packages) {
      expect(typeof pkg.name).toBe('string');
      expect(pkg.name.length).toBeGreaterThan(0);
      expect(typeof pkg.slug).toBe('string');
      expect(pkg.slug.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// resolvePort
// ---------------------------------------------------------------------------

describe('resolvePort', () => {
  it('returns null when raw is undefined', () => {
    expect(resolvePort(undefined)).toBeNull();
  });

  it('returns a number for a valid port string', () => {
    expect(resolvePort('3100')).toBe(3100);
    expect(resolvePort('1')).toBe(1);
    expect(resolvePort('65535')).toBe(65535);
  });

  it('throws for port 0', () => {
    expect(() => resolvePort('0')).toThrow(/Invalid --port/);
  });

  it('throws for port 65536', () => {
    expect(() => resolvePort('65536')).toThrow(/Invalid --port/);
  });

  it('throws for a non-numeric string', () => {
    expect(() => resolvePort('abc')).toThrow(/Invalid --port/);
  });

  it('throws for an empty string', () => {
    expect(() => resolvePort('')).toThrow(/Invalid --port/);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe('validate', () => {
  it('throws when input is null', () => {
    expect(() => validateBundledData(null)).toThrow(/malformed/);
  });

  it('throws when version field is missing', () => {
    expect(() => validateBundledData({ packages: [] })).toThrow(/malformed/);
  });

  it('throws when packages is not an array', () => {
    expect(() => validateBundledData({ packages: 'bad', version: '1.0.0' })).toThrow(/malformed/);
  });

  it('throws when a package entry is missing slug', () => {
    expect(() => validateBundledData({ packages: [{ name: '@vielzeug/x' }], version: '1.0.0' })).toThrow(/malformed/);
  });

  it('throws when a package entry is missing name', () => {
    expect(() => validateBundledData({ packages: [{ slug: 'x' }], version: '1.0.0' })).toThrow(/malformed/);
  });

  it('passes valid data through without throwing', () => {
    const input = { packages: [{ name: '@vielzeug/x', slug: 'x' }], version: '1.0.0' };

    expect(() => validateBundledData(input)).not.toThrow();
  });

  it('loadData succeeds with the bundled data file (smoke test)', () => {
    expect(() => loadData()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// index.ts re-exports smoke test
// ---------------------------------------------------------------------------

describe('index.ts re-exports', () => {
  it('exports loadData and packageMeta from data.js', () => {
    expect(typeof loadData).toBe('function');
    expect(typeof packageMeta).toBe('function');
  });

  it('createServerFromDisk returns a Server instance without throwing', async () => {
    const { createServerFromDisk } = await import('../index.js');
    const server = createServerFromDisk();

    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });
});
