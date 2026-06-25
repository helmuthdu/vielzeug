import { describe, expect, it } from 'vitest';

import { parseFrontmatter } from '../../scripts/frontmatter.ts';
import { generateBundledData } from '../../scripts/generator.ts';
import { loadData, packageMeta, validateBundledData } from '../data.js';
import { resolvePort } from '../port.js';
import { createServerFromDisk } from '../server.js';
import { SCHEMA_VERSION } from '../types.js';
import { makePkg, VALID_DATA } from './_fixtures.js';

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
    const md = `---\nrelated: ['ripple', 'ore']\n---`;

    expect(parseFrontmatter(md)).toEqual({ related: ['ripple', 'ore'] });
  });

  it('parses block sequence arrays', () => {
    const md = `---\nexports:\n  - signal\n  - computed\n  - effect\n---`;

    expect(parseFrontmatter(md)).toEqual({ exports: ['signal', 'computed', 'effect'] });
  });

  it('parses multi-line bracket arrays', () => {
    const md = `---\nexports:\n  [\n    createServer,\n    createServerFromDisk,\n    loadData,\n  ]\n---`;

    expect(parseFrontmatter(md)).toEqual({ exports: ['createServer', 'createServerFromDisk', 'loadData'] });
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
      components: [{ name: 'ore-button', tagName: 'ore-button' }],
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
// resolvePort
// ---------------------------------------------------------------------------

describe('resolvePort', () => {
  it('returns null when raw is undefined', () => {
    expect(resolvePort(undefined)).toBeNull();
  });

  it('parses valid port strings', () => {
    expect(resolvePort('3100')).toBe(3100);
    expect(resolvePort('1')).toBe(1);
    expect(resolvePort('65535')).toBe(65535);
  });

  it.each([
    ['0', '0'],
    ['65536', '65536'],
    ['-1', '-1'],
    ['abc', 'abc'],
    ['', ''],
    ['3.14', '3.14'],
    ['1.5', '1.5'],
    ['1e3', '1e3'],
  ])('throws for out-of-range, non-numeric, or non-integer value: %s', (_label, raw) => {
    expect(() => resolvePort(raw)).toThrow(/Invalid --port/);
  });
});

// ---------------------------------------------------------------------------
// validateBundledData + loadData
// ---------------------------------------------------------------------------

describe('validateBundledData', () => {
  it('returns the same object reference when data is valid', () => {
    expect(validateBundledData(VALID_DATA)).toBe(VALID_DATA);
  });

  it.each([
    ['null input', null],
    ['missing version', { packages: [], schemaVersion: SCHEMA_VERSION }],
    ['packages is not an array', { packages: 'bad', schemaVersion: SCHEMA_VERSION, version: '1.0.0' }],
    ['missing schemaVersion', { packages: [], version: '1.0.0' }],
    ['wrong schemaVersion', { packages: [], schemaVersion: 9999, version: '1.0.0' }],
  ])('throws for %s', (_label, input) => {
    expect(() => validateBundledData(input)).toThrow(/malformed|schema/);
  });

  it('throws for a package entry missing slug', () => {
    const bad = {
      packages: [{ name: '@vielzeug/x', version: '1.0.0' }],
      schemaVersion: SCHEMA_VERSION,
      version: '1.0.0',
    };

    expect(() => validateBundledData(bad)).toThrow(/malformed package entry/);
  });

  it('throws for a package entry missing name', () => {
    const bad = {
      packages: [{ slug: 'x', version: '1.0.0' }],
      schemaVersion: SCHEMA_VERSION,
      version: '1.0.0',
    };

    expect(() => validateBundledData(bad)).toThrow(/malformed package entry/);
  });

  it('throws for a package entry with empty slug', () => {
    const bad = {
      packages: [{ name: '@vielzeug/x', slug: '', version: '1.0.0' }],
      schemaVersion: SCHEMA_VERSION,
      version: '1.0.0',
    };

    expect(() => validateBundledData(bad)).toThrow(/malformed package entry/);
  });
});

describe('loadData', () => {
  it('loads and validates the bundled data file without throwing', () => {
    expect(() => loadData()).not.toThrow();
  });

  it('throws ENOENT with a descriptive message for a missing file', () => {
    expect(() => loadData('/nonexistent/path/data.json')).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// createServerFromDisk
// ---------------------------------------------------------------------------

describe('createServerFromDisk', () => {
  it('returns an MCP Server instance without throwing', () => {
    const server = createServerFromDisk();

    expect(server).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generateBundledData — projects override
// ---------------------------------------------------------------------------

describe('generateBundledData — projects override', () => {
  it('uses provided projects list and skips Rush discovery', () => {
    const result = generateBundledData({
      projects: [{ packageName: '@vielzeug/codex', projectFolder: 'packages/codex' }],
    });

    expect(result.data.packages).toHaveLength(1);
    expect(result.data.packages[0]!.slug).toBe('codex');
  });

  it('returns empty packages when projects list is empty', () => {
    const result = generateBundledData({ projects: [] });

    expect(result.data.packages).toHaveLength(0);
  });
});
