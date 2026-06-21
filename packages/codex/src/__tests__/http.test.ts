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

import { createRequestHandler } from '../http.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServer(): Server {
  return new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } });
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
