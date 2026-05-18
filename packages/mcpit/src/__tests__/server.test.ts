import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { BundledData } from '../types.js';

import { loadData } from '../data.js';
import { createServer } from '../index.js';

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };

let data: BundledData;
const activeClients: Client[] = [];

beforeAll(() => {
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
  it('registers all seven tools', async () => {
    const { client } = await createTestPair();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual([
      'get-component',
      'get-docs',
      'get-package',
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

  it('list-packages returns metadata without internal docs payload', async () => {
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

  it('get-package returns one metadata record', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'validit' },
      name: 'get-package',
    })) as ToolCallResult;
    const parsed = JSON.parse(readText(result)) as Record<string, unknown>;

    expect(parsed['slug']).toBe('validit');
    expect(parsed['name']).toBe('@vielzeug/validit');
  });

  it('get-docs reads a doc page', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'validit', page: 'api' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);
    expect(readText(result).length).toBeGreaterThan(0);
  });

  it('get-source returns the src/index.ts content', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'validit' },
      name: 'get-source',
    })) as ToolCallResult;

    expect(result.isError).not.toBe(true);
    expect(readText(result)).toContain('export');
  });

  it('get-docs rejects source as a page value', async () => {
    const { client } = await createTestPair();
    const result = (await client.callTool({
      arguments: { packageSlug: 'validit', page: 'source' },
      name: 'get-docs',
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
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

  it('list-components and get-component work when buildit metadata is available', async () => {
    const { client } = await createTestPair();
    const listResult = (await client.callTool({ arguments: {}, name: 'list-components' })) as ToolCallResult;

    if (listResult.isError) {
      expect(readText(listResult)).toContain('Buildit component metadata is unavailable');

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

  it('unknown tool returns MethodNotFound error', async () => {
    const { client } = await createTestPair();

    await expect(client.callTool({ arguments: {}, name: 'no-such-tool' })).rejects.toThrow();
  });
});
