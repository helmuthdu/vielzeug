import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotCatalog } from '../catalog.js';
import { startHttpHost } from '../http.js';
import { createMcpServer } from '../server.js';
import { loadSnapshot } from '../snapshot.js';

const roots: string[] = [];

function catalog({ refine = false }: { refine?: boolean } = {}): SnapshotCatalog {
  const root = mkdtempSync(join(tmpdir(), 'codex-http-'));
  const directory = join(root, 'snapshot');

  roots.push(root);
  mkdirSync(join(directory, 'packages'), { recursive: true });
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ schemaVersion: 2, version: '1.0.0' }));
  writeFileSync(join(directory, 'catalog.json'), JSON.stringify({ packages: [], version: '1.0.0' }));
  if (refine)
    writeFileSync(
      join(directory, 'refine.json'),
      JSON.stringify([{ description: 'A button.', tagName: 'ore-button' }]),
    );

  return new SnapshotCatalog(loadSnapshot(directory));
}

afterEach(async () => {
  const { rmSync } = await import('node:fs');

  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

// Both SSE-framed (`event: message\ndata: {...}`) and plain-JSON response bodies are valid MCP
// Streamable HTTP shapes: 2025-era (legacy) traffic answers as SSE by default, 2026-07-28
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
    const source = catalog();
    const host = await startHttpHost({
      createServer: () => createMcpServer(source, { version: '1.0.0' }),
      port: 0,
      version: '1.0.0',
    });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/health`);

      await expect(response.json()).resolves.toEqual({ status: 'ok', version: '1.0.0' });
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      await host.dispose();
      await expect(host.dispose()).resolves.toBeUndefined();
    }
  });

  it('rejects non-loopback host options and hostile Host/Origin headers', async () => {
    await expect(
      startHttpHost({
        createServer: () => createMcpServer(catalog(), { version: '1.0.0' }),
        host: '0.0.0.0' as '127.0.0.1',
        port: 0,
        version: '1.0.0',
      }),
    ).rejects.toThrow('loopback');

    const source = catalog();
    const host = await startHttpHost({
      createServer: () => createMcpServer(source, { version: '1.0.0' }),
      port: 0,
      version: '1.0.0',
    });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list', params: {} }),
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          host: 'evil.example',
          origin: 'http://evil.example',
        },
        method: 'POST',
      });

      expect(response.status).toBe(403);

      const originResponse = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'tools/list', params: {} }),
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          origin: 'http://evil.example',
        },
        method: 'POST',
      });

      expect(originResponse.status).toBe(403);
    } finally {
      await host.dispose();
    }
  });

  it('creates a fully configured Refine server for each request', async () => {
    let creations = 0;
    const source = catalog({ refine: true });
    const host = await startHttpHost({
      createServer: () => {
        creations += 1;
        return createMcpServer(source, { version: '1.0.0' });
      },
      port: 0,
      version: '1.0.0',
    });

    try {
      expect(creations).toBe(0);
      const response = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list', params: {} }),
        headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
        method: 'POST',
      });
      const { result } = await readMcpResult(response);
      const tools = result as { tools: { name: string }[] };

      expect(creations).toBe(1);
      expect(tools.tools.map((tool) => tool.name)).toContain('refine-list-components');

      const secondResponse = await fetch(`http://${host.host}:${host.port}/`, {
        body: JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'tools/list', params: {} }),
        headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(secondResponse.status).toBe(200);
      expect(creations).toBe(2);
      expect(host.disposed).toBe(false);
    } finally {
      await host.dispose();
      expect(host.disposed).toBe(true);
    }
  });

  it('answers a legacy-shaped tools/list call over the MCP endpoint', async () => {
    const source = catalog();
    const host = await startHttpHost({
      createServer: () => createMcpServer(source, { version: '1.0.0' }),
      port: 0,
      version: '1.0.0',
    });

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
      expect(tools.tools.map((tool) => tool.name)).not.toContain('refine-list-components');
    } finally {
      await host.dispose();
    }
  });

  it('answers a modern 2026-07-28 envelope-carrying tools/call over the MCP endpoint', async () => {
    const source = catalog();
    const host = await startHttpHost({
      createServer: () => createMcpServer(source, { version: '1.0.0' }),
      port: 0,
      version: '1.0.0',
    });

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
    const source = catalog();
    const host = await startHttpHost({
      createServer: () => createMcpServer(source, { version: '1.0.0' }),
      port: 0,
      version: '1.0.0',
    });

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
