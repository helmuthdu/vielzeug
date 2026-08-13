import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createMcpHandler, type McpHttpHandler } from '@modelcontextprotocol/server';
import { log } from './_log.js';
import type { Catalog } from './catalog.js';
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

/**
 * Builds a Web-standard `Request` from a Node `IncomingMessage` — `createMcpHandler()`'s
 * `fetch()` face speaks Fetch API objects (2026-07-28's stateless transport is Web-standard
 * `Request`/`Response`, not Node's own `req`/`res` pair), so the loopback host bridges once here.
 */
function toWebRequest(request: IncomingMessage): Request {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) for (const entry of value) headers.append(key, entry);
    else headers.set(key, value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  return new Request(`http://${request.headers.host ?? 'localhost'}${request.url}`, {
    ...(hasBody && { body: Readable.toWeb(request) as ReadableStream, duplex: 'half' }),
    headers,
    method: request.method,
  });
}

/** Writes a Web-standard `Response` back onto a Node `ServerResponse`, preserving repeated headers. */
async function sendWebResponse(webResponse: Response, response: ServerResponse): Promise<void> {
  response.statusCode = webResponse.status;

  for (const [key, value] of webResponse.headers) response.appendHeader(key, value);

  if (!webResponse.body) {
    response.end();

    return;
  }

  await pipeline(Readable.fromWeb(webResponse.body), response);
}

/** Streamable HTTP host owns every transport and only listens on loopback addresses. */
export async function startHttpHost(options: HttpHostOptions): Promise<HttpHost> {
  const host = options.host ?? '127.0.0.1';
  // Stateless by default (SEP-2575): a fresh server instance per request, matching the
  // spec's "any request can land on any instance" design — codex's tools carry no
  // per-connection state, so a persistent instance buys nothing beyond a small, negligible
  // (13-tool catalog) reconstruction cost per request.
  const factory = () => createMcpServer(options.catalog, { debug: options.debug, version: options.version });

  // `createMcpHandler()`'s factory only runs lazily, on the first real request — call it once
  // eagerly here so a broken catalog/registration setup fails `startHttpHost()` itself, before
  // the port opens, matching the old eager `mcpServer.connect()` fail-fast guarantee.
  factory();

  const handler: McpHttpHandler = createMcpHandler(factory);
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok', version: options.version }));

      return;
    }

    handler
      .fetch(toWebRequest(request))
      .then((webResponse) => sendWebResponse(webResponse, response))
      .catch((error: unknown) => {
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
      await handler.close();
    }
  };

  try {
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
