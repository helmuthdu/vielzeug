import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer } from 'node:http';

import { log } from './_log.js';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('access-control-allow-headers', 'content-type, mcp-session-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('access-control-allow-origin', '*');
}

function handleError(err: unknown, res: ServerResponse, req?: IncomingMessage): void {
  const message = err instanceof Error ? err.message : String(err);

  if (res.headersSent) {
    const ctx = req ? ` [${req.method} ${req.url}]` : '';

    log(`MCP HTTP error (mid-stream${ctx}): ${message}`);

    if (!res.writableEnded) res.end();

    return;
  }

  res.statusCode = 500;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message }));
}

export interface HttpServerHandle {
  dispose(): Promise<void>;
  readonly disposed: boolean;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Builds the HTTP request handler as a pure function — testable without binding a port.
 * Exported for use in integration tests.
 */
export function createRequestHandler(
  streamableTransport: StreamableHTTPServerTransport,
  sseSessions: Map<string, SSEServerTransport>,
  createSseServer: () => Server,
  version?: string,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    setCorsHeaders(res);

    const url = req.url ?? '/';

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();

      return;
    }

    if (req.method === 'GET' && url === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ status: 'ok', ...(version !== undefined && { version }) }));

      return;
    }

    // Legacy SSE: open a new SSE stream (each connection gets its own Server instance).
    if (req.method === 'GET' && url === '/sse') {
      const transport = new SSEServerTransport('/message', res);
      const sseServer = createSseServer();

      const cleanup = (): void => {
        sseSessions.delete(transport.sessionId);
      };

      sseSessions.set(transport.sessionId, transport);
      transport.onclose = cleanup;

      void sseServer.connect(transport);

      return;
    }

    // Legacy SSE: receive a client message.
    if (req.method === 'POST' && url.startsWith('/message')) {
      const sessionId = new URL(url, 'http://localhost').searchParams.get('sessionId') ?? '';
      const session = sseSessions.get(sessionId);

      if (!session) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Session not found' }));

        return;
      }

      void session.handlePostMessage(req, res).catch((err) => handleError(err, res, req));

      return;
    }

    // Streamable HTTP (spec-compliant clients).
    void streamableTransport.handleRequest(req, res).catch((err) => handleError(err, res, req));
  };
}

export async function startHttpServer(
  mcpServer: Server,
  port: number,
  createSseServer: () => Server,
  version?: string,
): Promise<HttpServerHandle> {
  // Legacy SSE sessions keyed by sessionId (for older MCP clients like Windsurf).
  const sseSessions = new Map<string, SSEServerTransport>();

  // Streamable HTTP transport (spec-compliant, newer clients).
  const streamableTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await mcpServer.connect(streamableTransport);

  const httpServer = createHttpServer(createRequestHandler(streamableTransport, sseSessions, createSseServer, version));

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => reject(err);

    httpServer.once('error', onError);
    httpServer.listen(port, () => {
      httpServer.off('error', onError);
      log(`codex MCP server listening on http://localhost:${port}/`);
      log(`  SSE (legacy):       GET  http://localhost:${port}/sse`);
      log(`  Streamable HTTP:    POST http://localhost:${port}/`);
      resolve();
    });
  });

  let disposed = false;

  const handle: HttpServerHandle = {
    dispose(): Promise<void> {
      if (disposed) return Promise.resolve();

      disposed = true;

      return new Promise<void>((resolve) => {
        httpServer.closeAllConnections?.();
        httpServer.close(() => resolve());
      });
    },
    get disposed(): boolean {
      return disposed;
    },
    [Symbol.asyncDispose](): Promise<void> {
      return this.dispose();
    },
  };

  return handle;
}
