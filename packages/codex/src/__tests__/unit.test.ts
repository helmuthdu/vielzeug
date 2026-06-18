import { describe, expect, it } from 'vitest';

import type { BundledData, BundledPackage } from '../types.js';

import { loadData, packageMeta, validateBundledData } from '../data.js';
import { parseFrontmatter } from '../frontmatter.js';
import { generateBundledData } from '../generator.js';
import { generateLlmsTxt, stripDocMarkup } from '../llms.js';
import { resolvePort } from '../port.js';
import { scorePackage } from '../search.js';
import { SCHEMA_VERSION } from '../types.js';

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

  it('scores description matches (metadata tier)', () => {
    const pkg = makePkg({ description: 'Reactive signals and computed values' });
    const hit = scorePackage(pkg, 'signal');

    expect(hit).not.toBeNull();
    expect(hit?.score).toBeGreaterThanOrEqual(3);
    expect(hit?.matchedIn).toContain('metadata');
  });

  it('scores name matches higher than description within metadata tier', () => {
    const byName = makePkg({ name: '@vielzeug/ripple' });
    const byDesc = makePkg({ description: 'ripple signals library' });
    const nameHit = scorePackage(byName, 'ripple');
    const descHit = scorePackage(byDesc, 'ripple');

    expect(nameHit?.score).toBeGreaterThan(descHit?.score ?? 0);
    expect(nameHit?.matchedIn).toContain('metadata');
  });

  it('scores keyword matches (keywords tier, score >= 2)', () => {
    const pkg = makePkg({ keywords: ['schema', 'validation', 'zod-like'] });
    const hit = scorePackage(pkg, 'validation');

    expect(hit?.score).toBeGreaterThanOrEqual(2);
    expect(hit?.score).toBeLessThan(3);
    expect(hit?.matchedIn).toContain('keywords');
  });

  it('scores doc page matches (docs tier, score < 2)', () => {
    const pkg = makePkg({
      availableDocPages: ['api'],
      docs: { api: '# API\n\nUse `createForm()` to build forms.' },
    });
    const hit = scorePackage(pkg, 'createform');

    expect(hit?.score).toBeGreaterThan(0);
    expect(hit?.score).toBeLessThan(2);
    expect(hit?.matchedIn).toContain('docs');
    expect(hit?.matchedPages).toContain('api');
  });

  it('scores apiSource matches below docs tier', () => {
    const pkg = makePkg({ apiSource: 'export function createQuery() {}' });
    const hit = scorePackage(pkg, 'createquery');

    expect(hit?.score).toBeGreaterThan(0);
    expect(hit?.score).toBeLessThan(2);
    expect(hit?.matchedIn).toContain('source');
    expect(hit?.matchedIn).not.toContain('docs');
    expect(hit?.matchedPages).toBeUndefined();
  });

  it('collects all match categories (multi-match)', () => {
    // Term matches both metadata AND keywords — both reported, score = highest weight
    const pkg = makePkg({
      description: 'A reactive signal library',
      keywords: ['reactive', 'signal'],
    });
    const hit = scorePackage(pkg, 'reactive');

    expect(hit?.score).toBeGreaterThanOrEqual(3);
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

    // keywords weight (2.5) > exports weight (2.2)
    expect(hit?.score).toBeGreaterThanOrEqual(2.5);
    expect(hit?.matchedIn).toContain('keywords');
    expect(hit?.matchedIn).toContain('exports');
  });

  it('scores exports array matches in keywords tier (score >= 2, < 3)', () => {
    const pkg = makePkg({ exports: ['signal', 'computed', 'effect'] });
    const hit = scorePackage(pkg, 'signal');

    expect(hit?.score).toBeGreaterThanOrEqual(2);
    expect(hit?.score).toBeLessThan(3);
    expect(hit?.matchedIn).toContain('exports');
    expect(hit?.matchedIn).not.toContain('keywords');
  });

  it('does not include matchedPages when only metadata matches', () => {
    const pkg = makePkg({ name: '@vielzeug/ripple' });
    const hit = scorePackage(pkg, 'ripple');

    expect(hit?.matchedPages).toBeUndefined();
  });

  it('matches hyphenated keywords with space-separated query terms', () => {
    const pkg = makePkg({ keywords: ['reactive-signal'] });
    const hit = scorePackage(pkg, 'reactive signal');

    expect(hit).not.toBeNull();
    expect(hit?.matchedIn).toContain('keywords');
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

  it('scores related array matches in keywords tier (score >= 2, < 3)', () => {
    const pkg = makePkg({ related: ['ripple', 'craft'] });
    const hit = scorePackage(pkg, 'ripple');

    expect(hit).not.toBeNull();
    expect(hit?.score).toBeGreaterThanOrEqual(2);
    expect(hit?.score).toBeLessThan(3);
    expect(hit?.matchedIn).toContain('related');
    expect(hit?.matchedIn).not.toContain('keywords');
    expect(hit?.matchedIn).not.toContain('exports');
  });

  it('keywords score higher than exports which score higher than related', () => {
    const kwOnly = makePkg({ keywords: ['forge'] });
    const exOnly = makePkg({ exports: ['forge'] });
    const relOnly = makePkg({ related: ['forge'] });

    const kwHit = scorePackage(kwOnly, 'forge');
    const exHit = scorePackage(exOnly, 'forge');
    const relHit = scorePackage(relOnly, 'forge');

    expect(kwHit?.score).toBeGreaterThan(exHit?.score ?? 0);
    expect(exHit?.score).toBeGreaterThan(relHit?.score ?? 0);
  });

  it('reports "keywords", "exports", and "related" when all match', () => {
    const pkg = makePkg({ exports: ['forge'], keywords: ['forge'], related: ['forge'] });
    const hit = scorePackage(pkg, 'forge');

    // keywords weight wins (2.5)
    expect(hit?.score).toBeGreaterThanOrEqual(2.5);
    expect(hit?.matchedIn).toContain('keywords');
    expect(hit?.matchedIn).toContain('exports');
    expect(hit?.matchedIn).toContain('related');
  });

  it('returns null for a query consisting only of hyphens', () => {
    const pkg = makePkg({ description: 'anything' });

    // "-" normalises to " " → splits to [] → terms empty → null
    expect(scorePackage(pkg, '-')).toBeNull();
    expect(scorePackage(pkg, '---')).toBeNull();
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

  it('returns data with the current schema version', () => {
    const { data } = generateBundledData();

    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
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

  it('truncates float strings via parseInt (3.14 → 3)', () => {
    expect(resolvePort('3.14')).toBe(3);
  });

  it('throws for a negative port', () => {
    expect(() => resolvePort('-1')).toThrow(/Invalid --port/);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

const VALID_DATA: BundledData = {
  packages: [
    {
      apiSource: null,
      availableDocPages: [],
      category: '',
      components: [],
      description: '',
      docs: {},
      exports: [],
      keywords: [],
      name: '@vielzeug/x',
      related: [],
      slug: 'x',
      version: '1.0.0',
    },
  ],
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
};

describe('validate', () => {
  it('throws when input is null', () => {
    expect(() => validateBundledData(null)).toThrow(/malformed|schema/);
  });

  it('throws when version is missing', () => {
    expect(() => validateBundledData({ packages: [], schemaVersion: SCHEMA_VERSION })).toThrow(/malformed|schema/);
  });

  it('throws when packages is not an array', () => {
    expect(() => validateBundledData({ packages: 'bad', schemaVersion: SCHEMA_VERSION, version: '1.0.0' })).toThrow(
      /malformed|schema/,
    );
  });

  it('throws when schemaVersion is missing', () => {
    expect(() => validateBundledData({ packages: [], version: '1.0.0' })).toThrow(/malformed|schema/);
  });

  it('throws when schemaVersion is wrong', () => {
    expect(() => validateBundledData({ packages: [], schemaVersion: 9999, version: '1.0.0' })).toThrow(
      /malformed|schema/,
    );
  });

  it('passes valid data through without throwing', () => {
    expect(() => validateBundledData(VALID_DATA)).not.toThrow();
  });

  it('returns the same object reference on success', () => {
    expect(validateBundledData(VALID_DATA)).toBe(VALID_DATA);
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

// ---------------------------------------------------------------------------
// stripDocMarkup
// ---------------------------------------------------------------------------

describe('stripDocMarkup', () => {
  it('removes frontmatter', () => {
    expect(stripDocMarkup('---\ntitle: Test\n---\n# Body')).toBe('# Body');
  });

  it('removes HTML tags', () => {
    expect(stripDocMarkup('<Badge type="tip" /> text')).toBe('text');
  });

  it('removes HTML comments', () => {
    expect(stripDocMarkup('<!-- comment -->\n# H')).toBe('# H');
  });

  it('removes [[toc]] directive', () => {
    expect(stripDocMarkup('[[toc]]\n# H')).toBe('# H');
  });

  it('passes through plain markdown unchanged', () => {
    const md = '# Heading\n\nSome paragraph text.\n\n- item 1\n- item 2';

    expect(stripDocMarkup(md)).toBe(md);
  });

  it('does not produce triple blank lines', () => {
    expect(stripDocMarkup('# H\n\n\n\nParagraph')).not.toMatch(/\n{3}/);
  });
});

// ---------------------------------------------------------------------------
// generateLlmsTxt
// ---------------------------------------------------------------------------

describe('generateLlmsTxt', () => {
  const minimalData: BundledData = {
    packages: [
      {
        apiSource: null,
        availableDocPages: ['index', 'api'],
        category: 'utilities',
        components: [],
        description: 'A minimal test package',
        docs: {
          api: '---\ntitle: API\n---\n## Functions\n\nThe `foo()` function does things.',
          index: '---\ntitle: Index\n---\n# Test\n\nA minimal test package.',
        },
        exports: ['foo', 'bar'],
        keywords: ['test'],
        name: '@vielzeug/test',
        related: [],
        slug: 'test',
        version: '1.0.0',
      },
    ],
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
  };

  it('returns non-empty strings for both outputs', () => {
    const { llmsFullTxt, llmsTxt } = generateLlmsTxt(minimalData);

    expect(llmsTxt.length).toBeGreaterThan(0);
    expect(llmsFullTxt.length).toBeGreaterThan(0);
  });

  it('llms.txt contains the package name', () => {
    const { llmsTxt } = generateLlmsTxt(minimalData);

    expect(llmsTxt).toContain('@vielzeug/test');
  });

  it('llms.txt groups packages under their category heading', () => {
    const { llmsTxt } = generateLlmsTxt(minimalData);

    expect(llmsTxt).toContain('### utilities');
  });

  it('llms.txt ends with a newline', () => {
    const { llmsTxt } = generateLlmsTxt(minimalData);

    expect(llmsTxt.endsWith('\n')).toBe(true);
  });

  it('llms-full.txt includes content from all available doc pages', () => {
    const { llmsFullTxt } = generateLlmsTxt(minimalData);

    expect(llmsFullTxt).toContain('The `foo()` function does things.');
    expect(llmsFullTxt).toContain('A minimal test package.');
  });

  it('llms-full.txt contains API Reference section label', () => {
    const { llmsFullTxt } = generateLlmsTxt(minimalData);

    expect(llmsFullTxt).toContain('### API Reference');
  });

  it('llms-full.txt ends with a newline', () => {
    const { llmsFullTxt } = generateLlmsTxt(minimalData);

    expect(llmsFullTxt.endsWith('\n')).toBe(true);
  });
});
