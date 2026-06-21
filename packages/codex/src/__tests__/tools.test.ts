/**
 * Unit tests for tool helpers and ToolContext construction.
 * Covers: optionalEnum (via get-docs), componentTags pre-computation, buildToolContext.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';

import type { BundledData, CemDeclaration } from '../types.js';

import { createServer } from '../server.js';
import { buildToolContext } from '../tools.js';
import { makePkg, SYNTHETIC_DATA } from './_fixtures.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const activeClients: Client[] = [];

afterEach(async () => {
  const clients = activeClients.splice(0);

  for (const client of clients) {
    await client.close();
  }
});

async function createTestPair(data: BundledData) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(data);

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
// optionalEnum — tested via get-docs tool
// ---------------------------------------------------------------------------

describe('optionalEnum (via get-docs)', () => {
  it('defaults to "index" when page is omitted', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const withDefault = await call(client, 'get-docs', { packageSlug: 'synthetic' });
    const explicit = await call(client, 'get-docs', { packageSlug: 'synthetic', page: 'index' });

    expect(withDefault.isError).not.toBe(true);
    expect(text(withDefault)).toBe(text(explicit));
  });

  it('returns isError when page is an invalid enum value', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: 'invalid-page' });

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/must be one of/);
  });

  it('returns isError when page is an empty string', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: '' });

    expect(result.isError).not.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildToolContext — componentTags pre-computation
// ---------------------------------------------------------------------------

describe('buildToolContext — componentTags', () => {
  const mockComponents: CemDeclaration[] = [
    { description: 'A button', name: 'Button', tagName: 'sg-button' },
    { description: 'An input', name: 'Input', tagName: 'sg-input' },
    { description: 'No tag — declaration without tagName', name: 'Mixin' },
  ];

  it('componentTags is null when sigil package has no components', () => {
    const ctx = buildToolContext(SYNTHETIC_DATA);

    expect(ctx.componentTags).toBeNull();
    expect(ctx.components).toBeNull();
  });

  it('componentTags contains only entries with a tagName', () => {
    const data: BundledData = {
      packages: [makePkg({ components: mockComponents, slug: 'sigil' })],
      schemaVersion: SYNTHETIC_DATA.schemaVersion,
      version: '0.0.0',
    };
    const ctx = buildToolContext(data);

    expect(ctx.componentTags).toEqual(['sg-button', 'sg-input']);
  });

  it('get-component error message uses pre-computed componentTags', async () => {
    const data: BundledData = {
      packages: [makePkg({ components: mockComponents, slug: 'sigil' })],
      schemaVersion: SYNTHETIC_DATA.schemaVersion,
      version: '0.0.0',
    };
    const { client } = await createTestPair(data);
    const result = await call(client, 'get-component', { tagName: 'sg-nonexistent' });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('sg-button');
    expect(text(result)).toContain('sg-input');
    expect(text(result)).not.toContain('Mixin');
  });
});
