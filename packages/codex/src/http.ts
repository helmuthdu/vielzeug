import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer } from 'node:http';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('access-control-allow-headers', 'content-type, mcp-session-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('access-control-allow-origin', '*');
}

function handleError(err: unknown, res: ServerResponse): void {
  const message = err instanceof Error ? err.message : String(err);

  if (!res.headersSent) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
  }

  if (!res.writableEnded) {
    res.end(JSON.stringify({ error: message }));
  } else {
    process.stderr.write(`MCP HTTP error (unwritten to client): ${message}\n`);
  }
}

async function handleRequest(
  transport: StreamableHTTPServerTransport,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();

    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'ok' }));

    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (err) {
    handleError(err, res);
  }
}

export async function startHttpServer(mcpServer: Server, port: number): Promise<void> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const httpServer = createHttpServer();

  await mcpServer.connect(transport);

  httpServer.on('request', (req, res) => {
    void handleRequest(transport, req, res);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => reject(err);

    httpServer.once('error', onError);
    httpServer.listen(port, () => {
      httpServer.off('error', onError);
      process.stderr.write(`codex MCP server listening on http://localhost:${port}/\n`);
      resolve();
    });
  });
}
