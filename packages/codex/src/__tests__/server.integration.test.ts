import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { BundledData } from '../types.js';

import { loadData } from '../data.js';
import { createServer } from '../server.js';
import { SYNTHETIC_DATA } from './_fixtures.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };

// ---------------------------------------------------------------------------
// Setup — load real bundled data once, share across all tests
// ---------------------------------------------------------------------------

let data: BundledData;
const activeClients: Client[] = [];
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFile = resolve(__dirname, '../../data/vielzeug-data.json');

beforeAll(async () => {
  const needsRegen =
    !existsSync(dataFile) ||
    (() => {
      try {
        loadData();

        return false;
      } catch {
        return true;
      }
    })();

  if (needsRegen) {
    const { generateBundledData } = await import('../../scripts/generator.ts');
    const { data: generated } = generateBundledData({ incremental: false });

    mkdirSync(dirname(dataFile), { recursive: true });
    writeFileSync(dataFile, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
  }

  data = loadData();
});

afterEach(async () => {
  const clients = activeClients.splice(0);

  for (const client of clients) {
    await client.close();
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestPair(bundledData = data) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(bundledData);

  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  await client.connect(clientTransport);
  activeClients.push(client);

  return { client };
}

function text(result: ToolCallResult): string {
  return result.content[0]?.text ?? '';
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
  return (await client.callTool({ arguments: args, name })) as ToolCallResult;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

describe('tool registration', () => {
  it('exposes exactly thirteen named tools', async () => {
    const { client } = await createTestPair();
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual([
      'get-docs',
      'get-example',
      'get-package',
      'get-source',
      'get-type-signature',
      'list-examples',
      'list-packages',
      'refine-generate-template',
      'refine-get-component',
      'refine-get-tokens',
      'refine-list-components',
      'refine-validate-usage',
      'search-packages',
    ]);
  });

  it('unknown tool name rejects with MethodNotFound', async () => {
    const { client } = await createTestPair();

    await expect(client.callTool({ arguments: {}, name: 'no-such-tool' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// list-packages
// ---------------------------------------------------------------------------

describe('list-packages', () => {
  it('returns all packages as PackageMeta objects (no docs or apiSource)', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'list-packages');
    const items = JSON.parse(text(result)) as Array<Record<string, unknown>>;

    expect(result.isError).not.toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('slug');
    expect(items[0]).toHaveProperty('hasSource');
    expect(items[0]).toHaveProperty('availableDocPages');
    expect(items[0]).not.toHaveProperty('docs');
    expect(items[0]).not.toHaveProperty('apiSource');
  });
});

// ---------------------------------------------------------------------------
// get-package
// ---------------------------------------------------------------------------

describe('get-package', () => {
  it('returns PackageMeta for a known slug', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-package', { packageSlug: 'spell' });
    const pkg = JSON.parse(text(result)) as Record<string, unknown>;

    expect(result.isError).not.toBe(true);
    expect(pkg['slug']).toBe('spell');
    expect(pkg).toHaveProperty('hasSource');
    expect(pkg).not.toHaveProperty('docs');
  });

  it('returns isError for an unknown slug', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-package', { packageSlug: 'does-not-exist' });

    expect(result.isError).toBe(true);
  });

  it('returns isError when packageSlug is missing', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-package');

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get-docs
// ---------------------------------------------------------------------------

describe('get-docs', () => {
  it('returns doc page content for a valid package and page', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-docs', { packageSlug: 'spell', page: 'api' });

    expect(result.isError).not.toBe(true);
    expect(text(result).length).toBeGreaterThan(0);
  });

  it('defaults to the index page when page is omitted', async () => {
    const { client } = await createTestPair();
    const withPage = await call(client, 'get-docs', { packageSlug: 'spell', page: 'index' });
    const withoutPage = await call(client, 'get-docs', { packageSlug: 'spell' });

    expect(withPage.isError).not.toBe(true);
    expect(text(withoutPage)).toBe(text(withPage));
  });

  it('page enum is [index, api, usage, examples] — no "source"', async () => {
    const { client } = await createTestPair();
    const { tools } = await client.listTools();
    const schema = tools.find((t) => t.name === 'get-docs')?.inputSchema as unknown as {
      properties: { page: { enum: string[] } };
      required: string[];
    };

    expect(schema.properties['page'].enum).toEqual(['index', 'api', 'usage', 'examples']);
    expect(schema.required).toContain('packageSlug');
  });

  it('returns isError when "source" is passed as page (not a valid enum)', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-docs', { packageSlug: 'spell', page: 'source' });

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/index|api|usage|examples/);
  });

  it('returns isError with available pages listed when the package lacks the requested page', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: 'examples' });

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/Available/);
  });

  it('returns isError for an unknown packageSlug', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-docs', { packageSlug: 'does-not-exist' });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get-source
// ---------------------------------------------------------------------------

describe('get-source', () => {
  it('returns src/index.ts content for a package that has source', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-source', { packageSlug: 'spell' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('export');
  });

  it('returns isError for a package with no source', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-source', { packageSlug: 'synthetic' });
    const { code, message } = JSON.parse(text(result)) as { code: string; message: string };

    expect(result.isError).toBe(true);
    expect(code).toBe('UNAVAILABLE');
    expect(message).toContain('no src/index.ts source');
  });

  it('returns isError for an unknown packageSlug', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'get-source', { packageSlug: 'does-not-exist' });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// search-packages
// ---------------------------------------------------------------------------

describe('search-packages', () => {
  it('returns hits with name, slug, score, and matchedIn for a matching query', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages', { query: 'signal' });
    const hits = JSON.parse(text(result)) as Array<Record<string, unknown>>;

    expect(result.isError).not.toBe(true);
    expect(hits.length).toBeGreaterThan(0);
    expect(typeof hits[0]?.['name']).toBe('string');
    expect(typeof hits[0]?.['score']).toBe('number');
    expect(Array.isArray(hits[0]?.['matchedIn'])).toBe(true);
  });

  it('name match scores at the top of results (>= 3.9)', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages', { query: 'ripple' });
    const hits = JSON.parse(text(result)) as Array<{ score: number; slug: string }>;
    const rippleHit = hits.find((h) => h.slug === 'ripple');

    expect(rippleHit).toBeDefined();
    expect(rippleHit!.score).toBeGreaterThanOrEqual(3.9);
  });

  it('returns empty array when nothing matches', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages', { query: 'zzz_no_match_xyz_' });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(text(result))).toEqual([]);
  });

  it('returns isError when query exceeds 500 characters', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages', { query: 'a'.repeat(501) });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('500');
  });

  it('returns isError when query is missing', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages');

    expect(result.isError).toBe(true);
  });

  it('includes "source" in matchedIn when query matches apiSource', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'search-packages', { query: 'createServer' });
    const hits = JSON.parse(text(result)) as Array<{ matchedIn: string[]; slug: string }>;
    const codexHit = hits.find((h) => h.slug === 'codex');

    expect(codexHit).toBeDefined();
    expect(codexHit!.matchedIn).toContain('source');
  });
});

// ---------------------------------------------------------------------------
// refine-list-components + refine-get-component
// ---------------------------------------------------------------------------

describe('refine-list-components + refine-get-component', () => {
  it('refine-list-components returns an array of tags or a graceful unavailable error', async () => {
    const { client } = await createTestPair();
    const result = await call(client, 'refine-list-components');

    if (result.isError) {
      expect(text(result)).toContain('unavailable');

      return;
    }

    const tags = JSON.parse(text(result)) as Array<{ tagName?: string }>;

    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(typeof tags[0]?.tagName).toBe('string');
  });

  it('refine-get-component returns details for a known tag when CEM is available', async () => {
    const { client } = await createTestPair();
    const listResult = await call(client, 'refine-list-components');

    if (listResult.isError) return; // refine not built — skip

    const tags = JSON.parse(text(listResult)) as Array<{ tagName: string }>;
    const firstTag = tags[0]!.tagName;
    const result = await call(client, 'refine-get-component', { tagName: firstTag });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain(firstTag);
  });

  it('refine-list-components returns isError when Refine CEM is absent', async () => {
    const noRefine: BundledData = { ...data, refineComponents: [] };
    const { client } = await createTestPair(noRefine);
    const result = await call(client, 'refine-list-components');

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('unavailable');
  });

  it('refine-get-component returns isError when Refine CEM is absent', async () => {
    const noRefine: BundledData = { ...data, refineComponents: [] };
    const { client } = await createTestPair(noRefine);
    const result = await call(client, 'refine-get-component', { tagName: 'ore-button' });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('unavailable');
  });
});
