/**
 * Tests for the data-generation pipeline:
 *   - generateBundledData (generator.ts)
 *   - stripDocMarkup + generateLlmsTxt (llms.ts)
 *
 * generateBundledData runs the full pipeline against the real monorepo docs.
 * All invariant checks share a single run to keep test time down.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import type { BundledData } from '../types.js';

import { generateBundledData } from '../../scripts/generator.ts';
import { generateLlmsTxt, stripDocMarkup } from '../../scripts/llms.ts';
import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// generateBundledData — run once, share the result
// ---------------------------------------------------------------------------

describe('generateBundledData', () => {
  let data: BundledData;

  beforeAll(() => {
    data = generateBundledData().data;
  });

  it('returns a non-empty packages array with current schema version', () => {
    expect(Array.isArray(data.packages)).toBe(true);
    expect(data.packages.length).toBeGreaterThan(0);
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.version.length).toBeGreaterThan(0);
  });

  it('packages are sorted by slug', () => {
    const slugs = data.packages.map((p) => p.slug);

    expect(slugs).toEqual([...slugs].sort((a, b) => a.localeCompare(b)));
  });

  it('every package has a non-empty name and slug', () => {
    for (const pkg of data.packages) {
      expect(pkg.name.length).toBeGreaterThan(0);
      expect(pkg.slug.length).toBeGreaterThan(0);
    }
  });

  it('availableDocPages matches the keys present in docs for every package', () => {
    for (const pkg of data.packages) {
      expect([...pkg.availableDocPages].sort()).toEqual(Object.keys(pkg.docs).sort());
    }
  });

  it('does not return hashes when incremental is false (default)', () => {
    expect(generateBundledData({ incremental: false }).hashes).toBeUndefined();
  });

  it('returns one hash per package when incremental is true', () => {
    const result = generateBundledData({ incremental: true });

    expect(result.hashes).toBeDefined();

    for (const slug of result.data.packages.map((p) => p.slug)) {
      expect(typeof result.hashes![slug]).toBe('string');
      expect(result.hashes![slug].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// stripDocMarkup
// ---------------------------------------------------------------------------

describe('stripDocMarkup', () => {
  it('removes frontmatter block', () => {
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

  it('passes plain markdown through unchanged', () => {
    const md = '# Heading\n\nSome paragraph text.\n\n- item 1\n- item 2';

    expect(stripDocMarkup(md)).toBe(md);
  });

  it('collapses consecutive blank lines to at most two', () => {
    expect(stripDocMarkup('# H\n\n\n\nParagraph')).not.toMatch(/\n{3}/);
  });
});

// ---------------------------------------------------------------------------
// generateLlmsTxt — shared fixture
// ---------------------------------------------------------------------------

const LLMS_DATA: BundledData = {
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

describe('generateLlmsTxt', () => {
  let llmsTxt: string;
  let llmsFullTxt: string;

  beforeAll(() => {
    ({ llmsFullTxt, llmsTxt } = generateLlmsTxt(LLMS_DATA));
  });

  describe('llms.txt', () => {
    it('contains the package name and is grouped under its category', () => {
      expect(llmsTxt).toContain('@vielzeug/test');
      expect(llmsTxt).toContain('### utilities');
    });

    it('ends with a newline', () => {
      expect(llmsTxt.endsWith('\n')).toBe(true);
    });
  });

  describe('llms-full.txt', () => {
    it('includes content from all available doc pages', () => {
      expect(llmsFullTxt).toContain('The `foo()` function does things.');
      expect(llmsFullTxt).toContain('A minimal test package.');
    });

    it('labels doc sections (e.g. API Reference)', () => {
      expect(llmsFullTxt).toContain('### API Reference');
    });

    it('ends with a newline', () => {
      expect(llmsFullTxt.endsWith('\n')).toBe(true);
    });
  });
});
