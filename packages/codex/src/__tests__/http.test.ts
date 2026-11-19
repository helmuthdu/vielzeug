import { afterEach, describe, expect, it } from 'vitest';

import { startHttpHost } from '../http.js';
import { createCodexServer } from '../server.js';
import { codexVersion, snapshotFixture } from './fixtures.js';

const hosts: Array<{ dispose(): Promise<void> }> = [];

function host() {
  const instance = startHttpHost({
    createServer: () => createCodexServer({ snapshot: snapshotFixture() }),
    port: 0,
    version: codexVersion,
  });

  hosts.push({ dispose: async () => void (await instance).dispose() });

  return instance;
}

afterEach(async () => {
  for (const entry of hosts.splice(0)) await entry.dispose();
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

async function initialize(port: number): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/`, {
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'initialize',
      params: { capabilities: {}, clientInfo: { name: 'test', version: '0' }, protocolVersion: '2025-06-18' },
    }),
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    method: 'POST',
  });
}

describe('HTTP host', () => {
  it('binds loopback and exposes health only as host-owned infrastructure', async () => {
    const instance = await host();

    const response = await fetch(`http://${instance.host}:${instance.port}/health`);

    await expect(response.json()).resolves.toEqual({ status: 'ok', version: codexVersion });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rejects non-loopback host options and hostile Host/Origin headers', async () => {
    await expect(
      startHttpHost({
        createServer: () => createCodexServer({ snapshot: snapshotFixture() }),
        host: '0.0.0.0' as '127.0.0.1',
        port: 0,
        version: codexVersion,
      }),
    ).rejects.toThrow('loopback');

    const instance = await host();

    const hostile = await fetch(`http://${instance.host}:${instance.port}/`, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list', params: {} }),
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        host: 'evil.example',
        origin: 'http://evil.example',
      },
      method: 'POST',
    });

    expect(hostile.status).toBe(403);

    const originResponse = await fetch(`http://${instance.host}:${instance.port}/`, {
      body: JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'tools/list', params: {} }),
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        origin: 'http://evil.example',
      },
      method: 'POST',
    });

    expect(originResponse.status).toBe(403);
  });

  it('serves the consolidated tool list over MCP', async () => {
    const instance = await host();
    const init = await initialize(instance.port);

    expect(init.status).toBe(200);

    const list = await fetch(`http://${instance.host}:${instance.port}/`, {
      body: JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'tools/list', params: {} }),
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      method: 'POST',
    });
    const { result } = await readMcpResult(list);
    const tools = (result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name);

    expect(tools).toEqual([
      'list-packages',
      'get-package',
      'get-docs',
      'get-example',
      'get-type-signature',
      'search',
      'refine-list-components',
      'refine-get-component',
      'refine-get-tokens',
      'refine-validate-usage',
    ]);
  });

  it('answers tool calls and reports expected catalog errors as tool errors', async () => {
    const instance = await host();

    await initialize(instance.port);

    const call = await fetch(`http://${instance.host}:${instance.port}/`, {
      body: JSON.stringify({
        id: 3,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { arguments: { slug: 'demo' }, name: 'get-package' },
      }),
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      method: 'POST',
    });
    const ok = await readMcpResult(call);

    expect((ok.result as { isError?: boolean }).isError).toBeUndefined();

    const bad = await fetch(`http://${instance.host}:${instance.port}/`, {
      body: JSON.stringify({
        id: 4,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { arguments: { slug: 'missing' }, name: 'get-package' },
      }),
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      method: 'POST',
    });
    const failed = await readMcpResult(bad);

    expect((failed.result as { isError: boolean }).isError).toBe(true);
    expect((failed.result as { content: Array<{ text: string }> }).content[0].text).toContain('NOT_FOUND');
  });

  it('carries the snapshot version in server instructions', async () => {
    const instance = await host();
    const init = await initialize(instance.port);
    const { result } = await readMcpResult(init);

    expect((result as { serverInfo?: { name: string } }).serverInfo?.name).toBe('vielzeug');
    expect((result as { instructions?: string }).instructions).toContain(codexVersion);
  });

  it('is idempotent to dispose twice', async () => {
    const instance = await host();

    await expect(instance.dispose()).resolves.toBeUndefined();
    await expect(instance.dispose()).resolves.toBeUndefined();
  });
});
