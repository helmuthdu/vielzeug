import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotCatalog } from '../catalog.js';
import { startHttpHost } from '../http.js';
import { loadSnapshot } from '../snapshot.js';

const roots: string[] = [];

function catalog(): SnapshotCatalog {
  const root = mkdtempSync(join(tmpdir(), 'codex-http-'));
  const directory = join(root, 'snapshots', 'test');

  roots.push(root);
  mkdirSync(join(directory, 'packages'), { recursive: true });
  writeFileSync(join(root, 'current.json'), JSON.stringify({ directory: 'snapshots/test' }));
  writeFileSync(
    join(directory, 'manifest.json'),
    JSON.stringify({
      catalog: 'catalog.json',
      contentDirectory: 'packages',
      refine: null,
      schemaVersion: 1,
      search: 'search.json',
      version: '1.0.0',
    }),
  );
  writeFileSync(join(directory, 'catalog.json'), JSON.stringify({ packages: [], version: '1.0.0' }));
  writeFileSync(join(directory, 'search.json'), '[]');

  return new SnapshotCatalog(loadSnapshot(root));
}

afterEach(async () => {
  const { rmSync } = await import('node:fs');

  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

// Both SSE-framed (`event: message\ndata: {...}`) and plain-JSON response bodies are valid MCP
// Streamable HTTP shapes — 2025-era (legacy) traffic answers as SSE by default, 2026-07-28
// (modern, envelope-carrying) traffic answered plain JSON in these tests. Read either.
async function readMcpResult(response: Response): Promise<{ error?: { message: string }; result?: unknown }> {
  const text = await response.text();
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '));

  return JSON.parse(dataLine ? dataLine.slice('data: '.length) : text) as {
    error?: { message: string };
    result?: unknown;
  };
}

describe('HTTP host', () => {
  it('binds loopback and exposes health only as host-owned infrastructure', async () => {
    const host = await startHttpHost({ catalog: catalog(), port: 0, version: '1.0.0' });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/health`);

      await expect(response.json()).resolves.toEqual({ status: 'ok', version: '1.0.0' });
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      await host.dispose();
      await expect(host.dispose()).resolves.toBeUndefined();
    }
  });

  it('answers a legacy-shaped tools/list call over the MCP endpoint', async () => {
    const host = await startHttpHost({ catalog: catalog(), port: 0, version: '1.0.0' });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list', params: {} }),
        headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const { result } = await readMcpResult(response);
      const tools = result as { tools: { name: string }[] };

      expect(tools.tools.map((tool) => tool.name)).toContain('search-packages');
    } finally {
      await host.dispose();
    }
  });

  it('answers a modern 2026-07-28 envelope-carrying tools/call over the MCP endpoint', async () => {
    const host = await startHttpHost({ catalog: catalog(), port: 0, version: '1.0.0' });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            _meta: {
              'io.modelcontextprotocol/clientCapabilities': {},
              'io.modelcontextprotocol/clientInfo': { name: 'codex-test', version: '1.0' },
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            },
            arguments: { query: 'ripple' },
            name: 'search-packages',
          },
        }),
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          'mcp-method': 'tools/call',
          'mcp-name': 'search-packages',
          'mcp-protocol-version': '2026-07-28',
        },
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const { result } = await readMcpResult(response);
      const content = result as { content: { text: string }[] };

      expect(content.content[0]?.text).toBe('[]');
    } finally {
      await host.dispose();
    }
  });

  it('rejects an unknown tool with a MethodNotFound JSON-RPC error', async () => {
    const host = await startHttpHost({ catalog: catalog(), port: 0, version: '1.0.0' });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { arguments: {}, name: 'does-not-exist' },
        }),
        headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
        method: 'POST',
      });

      const { error } = await readMcpResult(response);

      expect(error?.message).toContain('Unknown tool: does-not-exist');
    } finally {
      await host.dispose();
    }
  });
});
