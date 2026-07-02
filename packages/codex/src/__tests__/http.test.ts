/**
 * HTTP integration tests — bind to port 0 (ephemeral) so no port conflicts.
 * Tests cover: CORS headers, /health, OPTIONS preflight, SSE session
 * lifecycle, and streamable-HTTP fallthrough.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRequestHandler, startHttpServer } from '../http.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServer(): Server {
  return new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } });
}

/** Binds an ephemeral port, immediately releases it, and returns the port number for reuse. */
async function getFreePort(): Promise<number> {
  const probe = createHttpServer();

  return new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, () => {
      const addr = probe.address();

      probe.close(() => {
        if (addr && typeof addr === 'object') resolve(addr.port);
        else reject(new Error('could not get a free port'));
      });
    });
  });
}

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

async function startTestServer(createSseServer: () => Server = makeServer): Promise<TestServer> {
  const sseSessions = new Map<string, SSEServerTransport>();
  const streamableTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await makeServer().connect(streamableTransport);

  const httpServer = createHttpServer(createRequestHandler(streamableTransport, sseSessions, createSseServer));

  const port = await new Promise<number>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, () => {
      const addr = httpServer.address();

      if (addr && typeof addr === 'object') resolve(addr.port);
      else reject(new Error('could not get bound port'));
    });
  });

  return {
    baseUrl: `http://localhost:${port}`,
    close(): Promise<void> {
      return new Promise((resolve) => {
        httpServer.closeAllConnections?.();
        httpServer.close(() => resolve());
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HTTP transport — createRequestHandler', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    await server.close();
  });

  // -------------------------------------------------------------------------
  // /health
  // -------------------------------------------------------------------------

  describe('/health', () => {
    it('GET /health returns 200 JSON with status ok and CORS headers', async () => {
      const res = await fetch(`${server.baseUrl}/health`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  // -------------------------------------------------------------------------
  // CORS preflight
  // -------------------------------------------------------------------------

  describe('OPTIONS preflight', () => {
    it('returns 204 with CORS headers and no body', async () => {
      const res = await fetch(`${server.baseUrl}/`, { method: 'OPTIONS' });

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
    });
  });

  // -------------------------------------------------------------------------
  // SSE session lifecycle
  // -------------------------------------------------------------------------

  describe('SSE session lifecycle', () => {
    it('POST /message with unknown sessionId returns 404 with error body', async () => {
      const res = await fetch(`${server.baseUrl}/message?sessionId=unknown-session`, { method: 'POST' });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toHaveProperty('error');
    });

    it('GET /sse invokes the createSseServer factory', async () => {
      const factory = vi.fn(() => makeServer());
      const sseServer = await startTestServer(factory);

      try {
        const controller = new AbortController();
        const pending = fetch(`${sseServer.baseUrl}/sse`, { signal: controller.signal }).catch(() => null);

        await new Promise((r) => setTimeout(r, 50));

        expect(factory).toHaveBeenCalledOnce();

        controller.abort();
        await pending;
      } finally {
        await sseServer.close();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Streamable HTTP fallthrough
  // -------------------------------------------------------------------------

  describe('streamable HTTP fallthrough', () => {
    it('routes not handled by our router are delegated to the streamable transport', async () => {
      // GET /unknown-path bypasses our /health, /sse, /message, OPTIONS routes
      // and falls through to StreamableHTTPServerTransport.handleRequest().
      // The transport returns 4xx for unrecognised requests — confirming our
      // router did NOT intercept and short-circuit with its own hardcoded response.
      const res = await fetch(`${server.baseUrl}/unknown-path`);

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });
  });
});

// ---------------------------------------------------------------------------
// startHttpServer
// ---------------------------------------------------------------------------

describe('startHttpServer', () => {
  it('listens on the requested port and serves /health', async () => {
    const port = await getFreePort();
    const handle = await startHttpServer(makeServer(), port, makeServer);

    try {
      const res = await fetch(`http://localhost:${port}/health`);

      expect(res.status).toBe(200);
      expect(handle.disposed).toBe(false);
    } finally {
      await handle.dispose();
    }
  });

  it('dispose() closes the server, sets disposed, and is idempotent', async () => {
    const port = await getFreePort();
    const handle = await startHttpServer(makeServer(), port, makeServer);

    await handle.dispose();

    expect(handle.disposed).toBe(true);

    // Second call must not throw and must remain a no-op.
    await expect(handle.dispose()).resolves.toBeUndefined();
    await expect(fetch(`http://localhost:${port}/health`)).rejects.toThrow();
  });

  it('[Symbol.asyncDispose]() delegates to dispose()', async () => {
    const port = await getFreePort();

    {
      await using handle = await startHttpServer(makeServer(), port, makeServer);

      expect(handle.disposed).toBe(false);
    }

    await expect(fetch(`http://localhost:${port}/health`)).rejects.toThrow();
  });

  it('rejects with an error whose code is EADDRINUSE when the port is already bound', async () => {
    const port = await getFreePort();
    const first = await startHttpServer(makeServer(), port, makeServer);

    try {
      await expect(startHttpServer(makeServer(), port, makeServer)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    } finally {
      await first.dispose();
    }
  });
});
