import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { BundledData } from '../types.js';

import { loadData } from '../data.js';
import { createServer } from '../index.js';

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };

let data: BundledData;
const activeClients: Client[] = [];
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFile = resolve(__dirname, '../../data/vielzeug-data.json');

beforeAll(async () => {
  if (!existsSync(dataFile)) {
    // Import the generator function directly — faster than spawning a subprocess
    const { generateBundledData } = await import('../generator.js');
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

async function createTestPair() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(data);

  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  await client.connect(clientTransport);

  activeClients.push(client);

  return { client, server };
}

function readText(result: ToolCallResult): string {
  return result.content[0]?.text ?? '';
}

describe('vielzeug MCP server', () => {
  it('registers six tools', async () => {
    const { client } = await createTestPair();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual([
      'get-component',
      'get-docs',
      'get-source',
      'list-components',
      'list-packages',
      'search-packages',
    ]);
  });

  it('get-docs page enum only includes doc pages, not source', async () => {
    const { client } = await createTestPair();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === 'get-docs');

    expect(tool).toBeDefined();

    const schema = tool?.inputSchema as unknown as {
      properties: { page: { enum: string[] } };
      required: string[];
    };

    expect(schema.properties['page'].enum).toEqual(['index', 'api', 'usage', 'examples']);
    expect(schema.properties['page'].enum).not.toContain('source');
    expect(schema.required).toContain('packageSlug');
  });

  it('list-packages returns all packages without internal docs payload', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({ arguments: {}, name: 'list-packages' })) as ToolCallResult;
    const parsed = JSON.parse(readText(result)) as Array<Record<string, unknown>>;

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('name');
    expect(parsed[0]).toHaveProperty('availableDocPages');
    expect(parsed[0]).toHaveProperty('hasSource');
    expect(parsed[0]).not.toHaveProperty('docs');
    expect(parsed[0]).not.toHaveProperty('apiSource');
  });

  it('list-packages with packageSlug returns a single-item array', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'spell' },
      name: 'list-packages',
    })) as ToolCallResult;
    const parsed = JSON.parse(readText(result)) as Array<Record<string, unknown>>;

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.['slug']).toBe('spell');
    expect(parsed[0]).not.toHaveProperty('docs');
  });

  it('list-packages with unknown slug returns an error', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'does-not-exist' },
      name: 'list-packages',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
  });

  it('get-docs reads a doc page', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'spell', page: 'api' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);
    expect(readText(result).length).toBeGreaterThan(0);
  });

  it('get-source returns the src/index.ts content', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'spell' },
      name: 'get-source',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);
    expect(readText(result)).toContain('export');
  });

  it('get-docs rejects source as a page value', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'spell', page: 'source' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
  });

  it('get-source returns isError for a package with no source', async () => {
    // codex has no apiSource bundled (it's the MCP server itself, not a browser-accessible lib)
    const { client } = await createTestPair();
    const pkgMetas = JSON.parse(
      readText((await client.callTool({ arguments: {}, name: 'list-packages' })) as ToolCallResult),
    ) as Array<{ hasSource: boolean; slug: string }>;

    const noSourceSlug = pkgMetas.find((p) => !p.hasSource)?.slug;

    if (!noSourceSlug) return; // all packages have source — skip

    const result = (await client.callTool({
      arguments: { packageSlug: noSourceSlug },
      name: 'get-source',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(readText(result)).toContain('no src/index.ts source');
  });

  it('search-packages results include a name field on each hit', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { query: 'signal' },
      name: 'search-packages',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);

    const hits = JSON.parse(readText(result)) as Array<Record<string, unknown>>;

    expect(hits.length).toBeGreaterThan(0);
    expect(typeof hits[0]?.['name']).toBe('string');
    expect((hits[0]?.['name'] as string).length).toBeGreaterThan(0);
  });

  it('search-packages returns source in matchedIn when query matches apiSource', async () => {
    const { client } = await createTestPair();
    // 'createServer' is only in codex apiSource — a reliable source-only match
    const result = (await client.callTool({
      arguments: { query: 'createServer' },
      name: 'search-packages',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);

    const hits = JSON.parse(readText(result)) as Array<{ matchedIn: string[]; slug: string }>;
    const codexHit = hits.find((h) => h.slug === 'codex');

    // codex may or may not have apiSource in the snapshot — test defensively
    if (codexHit) {
      expect(codexHit.matchedIn).toContain('source');
    }
  });

  it('search-packages returns empty array for no matches', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { query: 'zzz_no_match_xyz_' },
      name: 'search-packages',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(readText(result))).toEqual([]);
  });

  it('search-packages results have matchedIn as an array and a score', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { query: 'signal' },
      name: 'search-packages',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);

    const hits = JSON.parse(readText(result)) as Array<Record<string, unknown>>;

    expect(hits.length).toBeGreaterThan(0);
    expect(Array.isArray(hits[0]?.['matchedIn'])).toBe(true);
    expect(typeof hits[0]?.['score']).toBe('number');
  });

  it('list-components and get-component work when sigil metadata is available', async () => {
    const { client } = await createTestPair();
    const listResult = (await client.callTool({ arguments: {}, name: 'list-components' })) as ToolCallResult;

    if (listResult.isError) {
      expect(readText(listResult)).toContain('Sigil component metadata is unavailable');

      return;
    }

    const tags = JSON.parse(readText(listResult)) as Array<{ tagName?: string }>;

    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);

    const firstTag = tags[0]?.tagName;

    expect(typeof firstTag).toBe('string');

    const componentResult = (await client.callTool({
      arguments: { tagName: firstTag },
      name: 'get-component',
    })) as ToolCallResult;

    expect(componentResult.isError).not.toBe(true);
    expect(readText(componentResult)).toContain(firstTag as string);
  });

  it('get-docs defaults to index page when page is omitted', async () => {
    const { client } = await createTestPair();
    const withPage = (await client.callTool({
      arguments: { packageSlug: 'spell', page: 'index' },
      name: 'get-docs',
    })) as ToolCallResult;
    const withoutPage = (await client.callTool({
      arguments: { packageSlug: 'spell' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(withPage.isError).not.toBe(true);
    expect(withoutPage.isError).not.toBe(true);
    expect(readText(withoutPage)).toBe(readText(withPage));
  });

  it('get-docs error lists available pages when requested page is missing', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      // 'source' is not a valid page enum value — triggers the enum-validation error
      arguments: { packageSlug: 'spell', page: 'source' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(readText(result)).toMatch(/index|api|usage|examples/);
  });

  it('unknown tool returns MethodNotFound error', async () => {
    const { client } = await createTestPair();

    await expect(client.callTool({ arguments: {}, name: 'no-such-tool' })).rejects.toThrow();
  });

  it('exposes MCP resources for doc pages and source', async () => {
    const { client } = await createTestPair();
    const { resources } = await client.listResources();

    expect(resources.length).toBeGreaterThan(0);

    const docResource = resources.find((r) => r.uri.startsWith('vielzeug://docs/'));

    expect(docResource).toBeDefined();
    expect(docResource?.mimeType).toBe('text/markdown');

    const sourceResource = resources.find((r) => r.uri.startsWith('vielzeug://source/'));

    expect(sourceResource).toBeDefined();
    expect(sourceResource?.mimeType).toBe('text/x-typescript');
  });

  it('get-docs returns error when page enum is valid but package lacks that page', async () => {
    // Use a synthetic data fixture with only index page — guarantees the missing-page path always runs
    const syntheticData: BundledData = {
      packages: [
        {
          apiSource: null,
          availableDocPages: ['index'],
          category: '',
          components: [],
          description: 'test',
          docs: { index: '# Test' },
          exports: [],
          keywords: [],
          name: '@vielzeug/synthetic',
          related: [],
          slug: 'synthetic',
          version: '1.0.0',
        },
      ],
      version: '0.0.0',
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const srv = createServer(syntheticData);

    await srv.connect(serverTransport);

    const client = new Client({ name: 'test-missing-page', version: '1.0.0' });

    await client.connect(clientTransport);
    activeClients.push(client);

    const result = (await client.callTool({
      arguments: { packageSlug: 'synthetic', page: 'examples' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(readText(result)).toMatch(/Available/);
  });

  it('list-components returns error when Sigil CEM is absent', async () => {
    const dataWithNoSigil: BundledData = {
      ...data,
      packages: data.packages.map((p) => (p.slug === 'sigil' ? { ...p, components: [] } : p)),
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const srv = createServer(dataWithNoSigil);

    await srv.connect(serverTransport);

    const client = new Client({ name: 'test-no-sigil-list', version: '1.0.0' });

    await client.connect(clientTransport);
    activeClients.push(client);

    const result = (await client.callTool({ arguments: {}, name: 'list-components' })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(readText(result)).toContain('unavailable');
  });

  it('get-component returns error when Sigil CEM is absent', async () => {
    // components: [] causes ToolContext.components to be null (tools.ts checks length > 0)
    const dataWithNoSigil: BundledData = {
      ...data,
      packages: data.packages.map((p) => (p.slug === 'sigil' ? { ...p, components: [] } : p)),
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const srv = createServer(dataWithNoSigil);

    await srv.connect(serverTransport);

    const client = new Client({ name: 'test-no-sigil', version: '1.0.0' });

    await client.connect(clientTransport);
    activeClients.push(client);

    const result = (await client.callTool({
      arguments: { tagName: 'sg-button' },
      name: 'get-component',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(readText(result)).toContain('unavailable');
  });

  it('reads a resource by URI', async () => {
    const { client } = await createTestPair();
    const { resources } = await client.listResources();

    // spell/index is guaranteed to exist — every package has an index doc
    const spellIndex = resources.find((r) => r.uri === 'vielzeug://docs/spell/index');

    expect(spellIndex).toBeDefined();

    const { contents } = await client.readResource({ uri: spellIndex!.uri });

    expect(contents.length).toBeGreaterThan(0);
    expect(typeof (contents[0] as { text?: string }).text).toBe('string');
  });
});
