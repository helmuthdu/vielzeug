import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type Server as HttpServer } from 'node:http';

import type { Catalog } from './catalog.js';

import { log } from './_log.js';
import { createMcpServer } from './server.js';

export interface HttpHost {
  dispose(): Promise<void>;
  readonly host: string;
  readonly port: number;
  [Symbol.asyncDispose](): Promise<void>;
}

export interface HttpHostOptions {
  catalog: Catalog;
  debug?: boolean;
  host?: '127.0.0.1' | '::1';
  port: number;
  version: string;
}

function close(server: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

/** Streamable HTTP host owns every transport and only listens on loopback addresses. */
export async function startHttpHost(options: HttpHostOptions): Promise<HttpHost> {
  const host = options.host ?? '127.0.0.1';
  const mcpServer = createMcpServer(options.catalog, { debug: options.debug, version: options.version });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok', version: options.version }));

      return;
    }

    void transport.handleRequest(request, response).catch((error) => {
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'MCP request failed' }));
      } else if (!response.writableEnded) response.end();

      log(`HTTP MCP error: ${error instanceof Error ? error.message : String(error)}`);
    });
  });

  let listening = false;
  let disposed = false;

  const dispose = async (): Promise<void> => {
    if (disposed) return;

    disposed = true;

    try {
      if (listening) await close(httpServer);
    } finally {
      await mcpServer.close();
    }
  };

  try {
    await mcpServer.connect(transport);
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(options.port, host, () => {
        httpServer.off('error', reject);
        listening = true;
        resolve();
      });
    });
  } catch (error) {
    await dispose();
    throw error;
  }

  const address = httpServer.address();
  const port = address && typeof address === 'object' ? address.port : options.port;

  log(`codex MCP HTTP host listening on http://${host}:${port}/`);

  return { dispose, host, port, [Symbol.asyncDispose]: dispose };
}
